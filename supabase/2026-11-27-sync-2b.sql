-- Lành giai đoạn 2B (Sơn duyệt 27/11/2026): nối dashboard Lành với Sơn Nga Family.
-- Chạy sau 2026-11-27-dashboard-gd1.sql. Chỉ thêm cột, bảng, hàm; không đổi dữ liệu cũ.
-- Lành là nơi ghi đơn, chi phí, kế hoạch; Sơn Nga đọc qua /api/sync (khoá đồng bộ riêng, không phải BO_KEY),
-- ghi vào Sheet rồi báo lại: vốn đã cấp, trạng thái từng dòng, quyết định cấp vốn.

-- 1. Cột mới -----------------------------------------------------------------------------
alter table public.campaigns
  add column sn_id text,
  add column sn_capital bigint,
  add column sn_status text,
  add column sn_synced_at timestamptz,
  add constraint campaigns_sn_id_chk check (sn_id is null or sn_id ~ '^CD-[0-9]{4,}$'),
  add constraint campaigns_sn_status_chk check (sn_status is null or sn_status in ('draft', 'running', 'settled'));
create unique index campaigns_sn_id_key on public.campaigns (sn_id) where sn_id is not null;
comment on column public.campaigns.sn_id is 'Mã chiến dịch bên Sơn Nga (CD-xxxx). Có mã = đã nối, tiền do Sơn Nga quản.';
comment on column public.campaigns.sn_capital is 'Vốn vào TK KINH DOANH LÀNH theo Sơn Nga (không gồm dòng do Lành ghi).';

alter table public.orders
  add column money_to text not null default 'hkd',
  add column ship_paid_by text,
  add constraint orders_money_to_chk check (money_to in ('hkd', 'rieng')),
  add constraint orders_ship_paid_by_chk check (ship_paid_by is null or ship_paid_by in ('tru-cod', 'tk-kd'));
comment on column public.orders.money_to is 'Tiền khách về: hkd = TK HỘ KINH DOANH, rieng = Ví riêng Sơn (hiếm, nhắc chuyển trước quyết toán).';
comment on column public.orders.ship_paid_by is 'Phí ship trả bằng: tru-cod = hãng trừ vào COD, tk-kd = TK KINH DOANH LÀNH. Trống = mặc định theo cách thanh toán.';

-- 2. Bảng mới ------------------------------------------------------------------------------
create table public.capital_requests (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id),
  kind text not null default 'them' check (kind in ('tao', 'them')),
  amount bigint not null check (amount between 1000 and 2000000000),
  note text check (note is null or char_length(note) <= 300),
  expense_ids bigint[] not null default '{}',
  status text not null default 'cho-duyet' check (status in ('cho-duyet', 'da-duyet', 'tu-choi', 'huy')),
  decided_amount bigint,
  reply text check (reply is null or char_length(reply) <= 300),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index capital_requests_one_pending on public.capital_requests (campaign_id) where status = 'cho-duyet';

-- Dòng đã sang Sơn Nga (ref O:<mã đơn> / E:<id chi>): để biết khi nào một đơn bị huỷ, một khoản chi bị xoá
-- mà bên Sơn Nga đang có dòng — khi đó Sơn Nga xoá dòng, tiền về lại tài khoản.
create table public.sync_items (
  ref text primary key check (ref ~ '^(O:[A-Za-z0-9-]{3,30}|E:[0-9]{1,18})$'),
  campaign_id bigint references public.campaigns(id),
  state text not null check (state in ('ok', 'cho-von', 'loi')),
  message text check (message is null or char_length(message) <= 300),
  updated_at timestamptz not null default now()
);
create table public.sync_runs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  source text not null check (source in ('tab', 'nut', 'cron', 'duyet')),
  added integer not null default 0, updated integer not null default 0, deleted integer not null default 0,
  failed integer not null default 0, pending integer not null default 0,
  message text check (message is null or char_length(message) <= 300)
);
alter table public.capital_requests enable row level security;
alter table public.sync_items enable row level security;
alter table public.sync_runs enable row level security;
revoke all on public.capital_requests, public.sync_items, public.sync_runs from anon, authenticated;

-- 3. Hàm phụ ----------------------------------------------------------------------------------
-- Khoá đồng bộ: chuỗi ngẫu nhiên dài, lưu SHA-256 (không lưu khoá gốc).
create or replace function private.sync_ok(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select value = encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex')
                   from private.settings where key = 'sync_key'), false)
    and char_length(coalesce(p_key, '')) >= 32
$$;

-- Phí ship thật của đơn trả bằng gì: none | tru-cod (hãng trừ vào COD) | tk-kd (TK KINH DOANH LÀNH).
-- Hoàn hàng, hoặc COD thu không đủ phí: luôn tk-kd.
create or replace function private.ship_by(p_status text, p_pay text, p_by text, p_got integer, p_ship integer) returns text
language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_ship, 0) <= 0 then 'none'
    when p_status = 'hoan-hang' then 'tk-kd'
    when coalesce(p_by, case when p_pay = 'cod' then 'tru-cod' else 'tk-kd' end) = 'tru-cod' and coalesce(p_got, 0) >= p_ship then 'tru-cod'
    else 'tk-kd' end
$$;

-- Tiền chiến dịch đã ra khỏi TK KINH DOANH LÀNH theo Lành: chi đã trả + phí ship trả từ tài khoản này.
create or replace function private.camp_spent(p_campaign bigint, p_skip_expense bigint default null) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(e.amount) from public.expenses e
                    where e.campaign_id = p_campaign and e.paid and e.id is distinct from p_skip_expense), 0)
       + coalesce((select sum(o.ship_cost) from public.orders o
                    where o.campaign_id = p_campaign and o.status in ('da-nhan-tien', 'hoan-hang')
                      and private.ship_by(o.status, o.pay_method, o.ship_paid_by, o.got_amount, o.ship_cost) = 'tk-kd'), 0)
$$;

-- Còn trong TK KINH DOANH LÀNH (phần chiến dịch). null = chưa nối Sơn Nga (không kiểm vốn).
create or replace function private.capital_left(p_campaign bigint, p_skip_expense bigint default null) returns bigint
language sql stable security definer set search_path = '' as $$
  select case when c.sn_id is null or c.sn_capital is null then null
              else c.sn_capital - private.camp_spent(c.id, p_skip_expense) end
  from public.campaigns c where c.id = p_campaign
$$;

-- 4. Đơn, chi phí, chiến dịch: thêm Tiền khách về, Phí ship trả bằng; chặn chi khi thiếu vốn; Sơn Nga giữ quyết toán ---------
create or replace function public.bo2_order_save(p_key text, p_id bigint, p_data jsonb) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare v public.orders; v0 public.orders; d jsonb := coalesce(p_data, '{}'::jsonb); it record; v_new boolean := p_id is null;
  v_phone text; v_camp bigint; v_st text;
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'bad_input' using errcode = 'P0001'; end if;
  if v_new then
    if not (d ? 'items') then raise exception 'invalid_items' using errcode = 'P0001'; end if;
    loop
      v.code := 'T' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'DDMM') || '-'
                || upper(substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 4));
      exit when not exists (select 1 from public.orders where code = v.code);
    end loop;
    v.created_at := now(); v.name := 'Khách lẻ'; v.status := 'da-xac-nhan'; v.origin := 'tay';
    v.channel := 'khac'; v.pay_method := 'cod'; v.campaign_id := private.running_campaign();
    if d ? 'date' and coalesce(d->>'date', '') <> '' then
      begin v.created_at := ((d->>'date')::date + time '12:00') at time zone 'Asia/Ho_Chi_Minh';
      exception when others then raise exception 'invalid_date' using errcode = 'P0001'; end;
      if v.created_at > now() + interval '1 day' or v.created_at < now() - interval '400 days' then
        raise exception 'invalid_date' using errcode = 'P0001';
      end if;
    end if;
  else
    select * into v from public.orders where id = p_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
    perform private.camp_editable(v.campaign_id);
  end if;
  v0 := v;

  if d ? 'campaign_id' then
    v_camp := nullif(d->>'campaign_id', '')::bigint;
    if v_camp is null or not exists (select 1 from public.campaigns where id = v_camp) then
      raise exception 'invalid_campaign' using errcode = 'P0001';
    end if;
    v.campaign_id := v_camp;
  end if;
  if v.campaign_id is null and v_new then raise exception 'invalid_campaign' using errcode = 'P0001'; end if;
  perform private.camp_editable(v.campaign_id);
  if d ? 'items' then
    select * into it from private.norm_items(d->'items', v.campaign_id);
    v.items := it.items; v.set_code := it.set_code; v.set_name := it.set_name;
    v.qty := it.qty; v.unit_price := it.unit_price; v.total := it.total;
  end if;
  if d ? 'name' then
    v.name := btrim(regexp_replace(coalesce(d->>'name', ''), '\s+', ' ', 'g'));
    if char_length(v.name) < 2 or char_length(v.name) > 80 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  end if;
  if d ? 'phone' then
    v_phone := regexp_replace(coalesce(d->>'phone', ''), '[^0-9]', '', 'g');
    if v_phone like '84%' and char_length(v_phone) = 11 then v_phone := '0' || substr(v_phone, 3); end if;
    v.phone := nullif(v_phone, '');
    if v.phone is not null and v.phone !~ '^0[0-9]{9,10}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  end if;
  if d ? 'address' then
    v.address := nullif(btrim(regexp_replace(coalesce(d->>'address', ''), '\s+', ' ', 'g')), '');
    if v.address is not null and char_length(v.address) not between 2 and 300 then raise exception 'invalid_address' using errcode = 'P0001'; end if;
  end if;
  if d ? 'zone' then
    v.zone := nullif(d->>'zone', '');
    if v.zone is not null and v.zone not in ('hcm', 'tinh') then raise exception 'invalid_zone' using errcode = 'P0001'; end if;
  end if;
  if d ? 'note' then v.note := left(nullif(btrim(coalesce(d->>'note', '')), ''), 300); end if;
  if d ? 'channel' then
    if not exists (select 1 from public.sources where key = d->>'channel') then raise exception 'invalid_channel' using errcode = 'P0001'; end if;
    v.channel := d->>'channel';
  end if;
  if d ? 'pay_method' then
    if coalesce(d->>'pay_method', '') not in ('cod', 'ck', 'tien-mat') then raise exception 'invalid_pay' using errcode = 'P0001'; end if;
    v.pay_method := d->>'pay_method';
  end if;
  if d ? 'carrier' then v.carrier := left(nullif(btrim(coalesce(d->>'carrier', '')), ''), 40); end if;
  if d ? 'ship_fee' then v.ship_fee := private.money_or_null(d->'ship_fee', 2000000); end if;
  if d ? 'got_amount' then v.got_amount := private.money_or_null(d->'got_amount', 2000000000); end if;
  if d ? 'ship_cost' then v.ship_cost := private.money_or_null(d->'ship_cost', 2000000); end if;
  if d ? 'recon_note' then v.recon_note := left(nullif(btrim(coalesce(d->>'recon_note', '')), ''), 200); end if;
  if d ? 'money_to' then
    if coalesce(d->>'money_to', '') not in ('hkd', 'rieng') then raise exception 'invalid_money_to' using errcode = 'P0001'; end if;
    v.money_to := d->>'money_to';
  end if;
  if d ? 'ship_paid_by' then
    v.ship_paid_by := nullif(d->>'ship_paid_by', '');
    if v.ship_paid_by is not null and v.ship_paid_by not in ('tru-cod', 'tk-kd') then raise exception 'invalid_ship_by' using errcode = 'P0001'; end if;
  end if;
  if d ? 'status' then
    v_st := coalesce(d->>'status', '');
    if v_st not in ('moi', 'da-xac-nhan', 'dang-giao', 'da-giao', 'da-nhan-tien', 'huy', 'hoan-hang') then
      raise exception 'invalid_status' using errcode = 'P0001';
    end if;
    v.status := v_st;
  end if;
  -- Đã nhận tiền hoặc hoàn hàng: số thực tế mặc định theo kế hoạch nếu chưa nhập
  if v.status = 'da-nhan-tien' then
    v.got_amount := coalesce(v.got_amount, v.total + coalesce(v.ship_fee, 0));
    v.ship_cost := coalesce(v.ship_cost, coalesce(v.ship_fee, 0));
    v.received_at := coalesce(v0.received_at, now());
  elsif v.status = 'hoan-hang' then
    v.got_amount := coalesce(v.got_amount, 0);
    v.ship_cost := coalesce(v.ship_cost, coalesce(v.ship_fee, 0));
    v.received_at := coalesce(v0.received_at, now());
  else
    v.received_at := null;
  end if;
  -- Kế hoạch (hàng, phí ship báo khách) khoá khi đơn đã đối soát; muốn sửa thì đưa đơn về Đã giao trước
  if not v_new and v0.status in ('da-nhan-tien', 'hoan-hang') and v.status in ('da-nhan-tien', 'hoan-hang')
     and (v.items is distinct from v0.items or v.ship_fee is distinct from v0.ship_fee) then
    raise exception 'plan_locked' using errcode = 'P0001';
  end if;
  v.updated_at := now();

  if v_new then
    insert into public.orders (code, created_at, name, phone, address, set_code, set_name, qty, unit_price, total, note, status, zone, ship_fee,
      campaign_id, channel, origin, items, pay_method, carrier, got_amount, ship_cost, recon_note, received_at, updated_at, money_to, ship_paid_by)
    values (v.code, v.created_at, v.name, v.phone, v.address, v.set_code, v.set_name, v.qty, v.unit_price, v.total, v.note, v.status, v.zone, v.ship_fee,
      v.campaign_id, v.channel, v.origin, v.items, v.pay_method, v.carrier, v.got_amount, v.ship_cost, v.recon_note, v.received_at, v.updated_at, coalesce(v.money_to, 'hkd'), v.ship_paid_by)
    returning * into v;
  else
    update public.orders set name = v.name, phone = v.phone, address = v.address, set_code = v.set_code, set_name = v.set_name,
      qty = v.qty, unit_price = v.unit_price, total = v.total, note = v.note, status = v.status, zone = v.zone, ship_fee = v.ship_fee,
      campaign_id = v.campaign_id, channel = v.channel, items = v.items, pay_method = v.pay_method, carrier = v.carrier,
      got_amount = v.got_amount, ship_cost = v.ship_cost, recon_note = v.recon_note, received_at = v.received_at, updated_at = v.updated_at,
      money_to = coalesce(v.money_to, 'hkd'), ship_paid_by = v.ship_paid_by
    where id = v.id returning * into v;
  end if;
  insert into public.audit (entity, entity_id, action, data) values ('order', v.id, case when v_new then 'create' else 'update' end, d);
  return v;
end $$;

create or replace function public.bo2_expense_save(p_key text, p_id bigint, p_data jsonb) returns public.expenses
language plpgsql security definer set search_path = '' as $$
declare v public.expenses; d jsonb := coalesce(p_data, '{}'::jsonb); v_new boolean := p_id is null; v_camp bigint; n integer; v0 public.expenses; v_left bigint;
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'bad_input' using errcode = 'P0001'; end if;
  if v_new then
    v.campaign_id := private.running_campaign(); v.spent_on := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
    v.cat := 'khac'; v.paid := true; v.created_at := now();
  else
    select * into v from public.expenses where id = p_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
    perform private.camp_editable(v.campaign_id);
    v0 := v;
  end if;
  if d ? 'campaign_id' then
    v_camp := nullif(d->>'campaign_id', '')::bigint;
    if v_camp is null or not exists (select 1 from public.campaigns where id = v_camp) then
      raise exception 'invalid_campaign' using errcode = 'P0001';
    end if;
    v.campaign_id := v_camp;
  end if;
  if v.campaign_id is null then raise exception 'invalid_campaign' using errcode = 'P0001'; end if;
  perform private.camp_editable(v.campaign_id);
  if d ? 'spent_on' then
    begin v.spent_on := (d->>'spent_on')::date;
    exception when others then raise exception 'invalid_date' using errcode = 'P0001'; end;
    if v.spent_on is null then raise exception 'invalid_date' using errcode = 'P0001'; end if;
  end if;
  if d ? 'cat' then
    if coalesce(d->>'cat', '') not in ('nhap', 'baobi', 'quangcao', 'vanchuyen', 'khac') then raise exception 'invalid_cat' using errcode = 'P0001'; end if;
    v.cat := d->>'cat';
  end if;
  if d ? 'name' then
    v.name := btrim(regexp_replace(coalesce(d->>'name', ''), '\s+', ' ', 'g'));
  end if;
  if v.name is null or char_length(v.name) < 2 or char_length(v.name) > 120 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if d ? 'amount' then v.amount := private.money_or_null(d->'amount', 2000000000); end if;
  if v.amount is null or v.amount < 1 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  if d ? 'units' then
    n := private.money_or_null(d->'units', 1000000);
    if n is not null and n < 1 then n := null; end if;
    v.units := n;
  end if;
  if d ? 'vendor' then v.vendor := left(nullif(btrim(coalesce(d->>'vendor', '')), ''), 80); end if;
  if d ? 'paid' then
    if jsonb_typeof(d->'paid') <> 'boolean' then raise exception 'bad_input' using errcode = 'P0001'; end if;
    v.paid := (d->>'paid')::boolean;
  end if;
  if d ? 'note' then v.note := left(nullif(btrim(coalesce(d->>'note', '')), ''), 300); end if;
  -- Quy tắc B của Sơn Nga: chi chiến dịch đã nối trả từ TK KINH DOANH LÀNH, chỉ khi phần chiến dịch còn đủ tiền.
  -- Chỉ kiểm khi khoản thêm tiền ra (mới, chuyển sang Đã trả, tăng số, đổi chiến dịch); sửa tên, ghi chú không bị chặn.
  if v.paid and (v_new or not v0.paid or v.amount > v0.amount or v.campaign_id is distinct from v0.campaign_id) then
    v_left := private.capital_left(v.campaign_id, case when v_new then null else v.id end);
    if v_left is not null and v.amount > v_left + 1000 then
      raise exception 'no_capital' using errcode = 'P0001', hint = greatest(v_left, 0)::text;
    end if;
  end if;
  v.updated_at := now();
  if v_new then
    insert into public.expenses (campaign_id, spent_on, cat, name, amount, units, vendor, paid, note, created_at, updated_at)
    values (v.campaign_id, v.spent_on, v.cat, v.name, v.amount, v.units, v.vendor, v.paid, v.note, v.created_at, v.updated_at)
    returning * into v;
  else
    update public.expenses set campaign_id = v.campaign_id, spent_on = v.spent_on, cat = v.cat, name = v.name, amount = v.amount,
      units = v.units, vendor = v.vendor, paid = v.paid, note = v.note, updated_at = v.updated_at
    where id = v.id returning * into v;
  end if;
  insert into public.audit (entity, entity_id, action, data) values ('expense', v.id, case when v_new then 'create' else 'update' end, d);
  return v;
end $$;

create or replace function public.bo2_campaign_save(p_key text, p_id bigint, p_data jsonb) returns public.campaigns
language plpgsql security definer set search_path = '' as $$
declare v public.campaigns; v0 public.campaigns; d jsonb := coalesce(p_data, '{}'::jsonb); v_new boolean := p_id is null;
  e jsonb; v_sets jsonb := '[]'::jsonb; k text; b jsonb := '{}'::jsonb; n integer; v_code text; v_name text; v_price integer; v_qty integer; v_web integer;
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'bad_input' using errcode = 'P0001'; end if;
  if v_new then
    v.status := 'draft'; v.budget := '{}'::jsonb; v.sets := '[]'::jsonb; v.created_at := now();
    v.code := 'cd-' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDDHH24MISS');
  else
    select * into v from public.campaigns where id = p_id for update;
    if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  end if;
  v0 := v;
  -- Đã quyết toán: chỉ được mở lại (đổi trạng thái) hoặc sửa ghi chú
  if not v_new and v0.status = 'settled' and coalesce(d->>'status', 'settled') = 'settled'
     and exists (select 1 from jsonb_object_keys(d) x where x not in ('status', 'note')) then
    raise exception 'locked' using errcode = 'P0001';
  end if;
  if d ? 'name' then
    v.name := btrim(regexp_replace(coalesce(d->>'name', ''), '\s+', ' ', 'g'));
  end if;
  if v.name is null or char_length(v.name) < 2 or char_length(v.name) > 60 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if d ? 'code' then
    v.code := coalesce(d->>'code', '');
    if v.code !~ '^[a-z0-9-]{2,40}$' then raise exception 'invalid_code' using errcode = 'P0001'; end if;
    if exists (select 1 from public.campaigns where code = v.code and id is distinct from v.id) then
      raise exception 'code_taken' using errcode = 'P0001';
    end if;
  end if;
  if d ? 'status' then
    if coalesce(d->>'status', '') not in ('draft', 'running', 'closed', 'settled') then raise exception 'invalid_status' using errcode = 'P0001'; end if;
    v.status := d->>'status';
  end if;
  -- Chiến dịch đã nối: quyết toán, mở lại, đổi mã làm ở Sơn Nga
  if not v_new and v0.sn_id is not null and ((v.status = 'settled') is distinct from (v0.status = 'settled') or v.code <> v0.code) then
    raise exception 'sn_controls' using errcode = 'P0001';
  end if;
  -- Tạo ở Lành, đang chờ Sơn Nga duyệt vốn: chưa mở bán
  if not v_new and v0.sn_id is null and v.status = 'running' and v0.status <> 'running'
     and exists (select 1 from public.capital_requests r where r.campaign_id = v0.id and r.kind = 'tao' and r.status = 'cho-duyet') then
    raise exception 'wait_capital' using errcode = 'P0001';
  end if;
  v.settled_at := case when v.status = 'settled' then coalesce(v0.settled_at, now()) else null end;
  if d ? 'start_date' then
    begin v.start_date := nullif(d->>'start_date', '')::date;
    exception when others then raise exception 'invalid_date' using errcode = 'P0001'; end;
  end if;
  if d ? 'end_date' then
    begin v.end_date := nullif(d->>'end_date', '')::date;
    exception when others then raise exception 'invalid_date' using errcode = 'P0001'; end;
  end if;
  if v.start_date is not null and v.end_date is not null and v.end_date < v.start_date then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;
  if d ? 'target_revenue' then v.target_revenue := private.money_or_null(d->'target_revenue', 2000000000); end if;
  if d ? 'budget' then
    if jsonb_typeof(d->'budget') <> 'object' then raise exception 'invalid_budget' using errcode = 'P0001'; end if;
    for k in select jsonb_object_keys(d->'budget') loop
      if k not in ('nhap', 'baobi', 'quangcao', 'vanchuyen', 'khac') then raise exception 'invalid_budget' using errcode = 'P0001'; end if;
      n := private.money_or_null(d->'budget'->k, 2000000000);
      if n is not null and n > 0 then b := b || jsonb_build_object(k, n); end if;
    end loop;
    v.budget := b;
  end if;
  if d ? 'sets' then
    if jsonb_typeof(d->'sets') <> 'array' or jsonb_array_length(d->'sets') > 12 then raise exception 'invalid_sets' using errcode = 'P0001'; end if;
    for e in select x.value from jsonb_array_elements(d->'sets') x loop
      v_code := e->>'code'; v_name := btrim(coalesce(e->>'name', ''));
      if v_code is null or v_code !~ '^[a-z0-9-]{2,40}$' or v_code = 'nhieu-set' or char_length(v_name) < 1 or char_length(v_name) > 80
         or exists (select 1 from jsonb_array_elements(v_sets) y where y.value->>'code' = v_code) then
        raise exception 'invalid_sets' using errcode = 'P0001';
      end if;
      v_web := (select p.price from private.set_price(v_code) p);
      begin
        v_price := coalesce(v_web, private.money_or_null(e->'price', 100000000), 0);
        v_qty := private.money_or_null(e->'qty', 100000);
      exception when others then raise exception 'invalid_sets' using errcode = 'P0001';
      end;
      v_sets := v_sets || jsonb_build_array(jsonb_build_object('code', v_code,
        'name', case when v_web is not null then (select p.name from private.set_price(v_code) p) else v_name end,
        'price', v_price, 'qty', v_qty, 'web', v_web is not null));
    end loop;
    v.sets := v_sets;
  end if;
  if d ? 'note' then v.note := left(nullif(btrim(coalesce(d->>'note', '')), ''), 500); end if;
  v.updated_at := now();
  if v_new then
    insert into public.campaigns (code, name, status, start_date, end_date, target_revenue, budget, sets, note, settled_at, created_at, updated_at)
    values (v.code, v.name, v.status, v.start_date, v.end_date, v.target_revenue, v.budget, v.sets, v.note, v.settled_at, v.created_at, v.updated_at)
    returning * into v;
  else
    update public.campaigns set code = v.code, name = v.name, status = v.status, start_date = v.start_date, end_date = v.end_date,
      target_revenue = v.target_revenue, budget = v.budget, sets = v.sets, note = v.note, settled_at = v.settled_at, updated_at = v.updated_at
    where id = v.id returning * into v;
  end if;
  insert into public.audit (entity, entity_id, action, data) values ('campaign', v.id, case when v_new then 'create' else 'update' end, d);
  return v;
end $$;


-- 5. Dashboard: dữ liệu (thêm yêu cầu vốn, trạng thái đồng bộ) ------------------------------
create or replace function public.bo2_data(p_key text) returns json
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  return json_build_object(
    'campaigns', (select coalesce(json_agg(c order by c.id), '[]'::json) from public.campaigns c),
    'sources', (select coalesce(json_agg(s order by s.sort, s.key), '[]'::json) from public.sources s),
    'orders', (select coalesce(json_agg(o order by o.created_at desc), '[]'::json)
                 from (select * from public.orders order by created_at desc limit 5000) o),
    'expenses', (select coalesce(json_agg(e order by e.spent_on desc, e.id desc), '[]'::json) from public.expenses e),
    'capital_requests', (select coalesce(json_agg(r order by r.id desc), '[]'::json)
                           from (select * from public.capital_requests order by id desc limit 300) r),
    'sync_items', (select coalesce(json_agg(json_build_object('ref', i.ref, 'campaign_id', i.campaign_id, 'state', i.state,
                     'message', i.message, 'at', i.updated_at)), '[]'::json) from public.sync_items i),
    'sync_runs', (select coalesce(json_agg(r order by r.id desc), '[]'::json)
                    from (select * from public.sync_runs order by id desc limit 10) r),
    'at', now());
end $$;

-- 10. Dashboard: xin vốn (một yêu cầu chờ duyệt mỗi chiến dịch; gửi lại thì sửa yêu cầu đang chờ) -------
create or replace function public.bo2_capreq_save(p_key text, p_data jsonb) returns public.capital_requests
language plpgsql security definer set search_path = '' as $$
declare d jsonb := coalesce(p_data, '{}'::jsonb); c public.campaigns; v public.capital_requests; v_amount integer; v_note text;
  v_ids bigint[] := '{}';
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' or coalesce(d->>'campaign_id', '') !~ '^[0-9]{1,18}$' then raise exception 'invalid_campaign' using errcode = 'P0001'; end if;
  select * into c from public.campaigns where id = (d->>'campaign_id')::bigint for update;
  if not found then raise exception 'invalid_campaign' using errcode = 'P0001'; end if;
  if c.status = 'settled' then raise exception 'locked' using errcode = 'P0001'; end if;
  v_amount := private.money_or_null(d->'amount', 2000000000);
  if v_amount is null or v_amount < 1000 then raise exception 'invalid_amount' using errcode = 'P0001'; end if;
  v_note := left(nullif(btrim(regexp_replace(coalesce(d->>'note', ''), '\s+', ' ', 'g')), ''), 300);
  if d ? 'expense_ids' then
    if jsonb_typeof(d->'expense_ids') <> 'array' or jsonb_array_length(d->'expense_ids') > 20
       or exists (select 1 from jsonb_array_elements_text(d->'expense_ids') x where x !~ '^[0-9]{1,18}$') then
      raise exception 'bad_input' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(distinct e.id), '{}') into v_ids from public.expenses e
      where e.campaign_id = c.id and e.id in (select x::bigint from jsonb_array_elements_text(d->'expense_ids') x);
  end if;
  select * into v from public.capital_requests where campaign_id = c.id and status = 'cho-duyet' for update;
  if found then
    update public.capital_requests set amount = v_amount, note = v_note, expense_ids = v_ids,
      kind = case when c.sn_id is null then 'tao' else 'them' end, created_at = now()
    where id = v.id returning * into v;
  else
    insert into public.capital_requests (campaign_id, kind, amount, note, expense_ids)
    values (c.id, case when c.sn_id is null then 'tao' else 'them' end, v_amount, v_note, v_ids)
    returning * into v;
  end if;
  insert into public.audit (entity, entity_id, action, data) values ('capreq', v.id, 'save', d);
  return v;
end $$;

create or replace function public.bo2_capreq_cancel(p_key text, p_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.capital_requests set status = 'huy', decided_at = now() where id = p_id and status = 'cho-duyet';
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  insert into public.audit (entity, entity_id, action, data) values ('capreq', p_id, 'cancel', '{}'::jsonb);
  return p_id;
end $$;

-- 11. Đồng bộ: Sơn Nga đọc (khoá đồng bộ). p_lock: giữ lượt 150 giây để hai lượt không ghi trùng ------------
create or replace function public.sync_export(p_key text, p_lock boolean default false) returns json
language plpgsql security definer set search_path = '' as $$
declare v_lock text; v_busy boolean := false;
begin
  if not private.sync_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_lock then
    perform pg_advisory_xact_lock(hashtext('lanh_sync_lock'));
    select value into v_lock from private.settings where key = 'sync_lock';
    if v_lock is not null and v_lock::timestamptz > now() then v_busy := true;
    else
      delete from private.settings where key = 'sync_lock';
      insert into private.settings (key, value) values ('sync_lock', (now() + interval '150 seconds')::text);
    end if;
  end if;
  return json_build_object(
    'at', now(), 'busy', v_busy,
    'campaigns', (select coalesce(json_agg(json_build_object('id', c.id, 'code', c.code, 'name', c.name, 'status', c.status,
        'start', c.start_date, 'end', c.end_date, 'target', c.target_revenue, 'budget', c.budget, 'sets', c.sets, 'sn_id', c.sn_id,
        'capital_left', private.capital_left(c.id)) order by c.id), '[]'::json) from public.campaigns c),
    'orders', (select coalesce(json_agg(json_build_object('code', o.code, 'campaign', c.code, 'status', o.status, 'items', o.items,
        'total', o.total, 'ship_fee', o.ship_fee, 'got', o.got_amount, 'ship', o.ship_cost, 'pay', o.pay_method, 'money_to', o.money_to,
        'ship_by', private.ship_by(o.status, o.pay_method, o.ship_paid_by, o.got_amount, o.ship_cost),
        'channel', coalesce(s.label, o.channel), 'customer', o.name,
        'date', (coalesce(o.received_at, o.updated_at) at time zone 'Asia/Ho_Chi_Minh')::date) order by o.received_at, o.id), '[]'::json)
      from public.orders o join public.campaigns c on c.id = o.campaign_id left join public.sources s on s.key = o.channel
      where c.sn_id is not null and o.status in ('da-nhan-tien', 'hoan-hang')),
    'expenses', (select coalesce(json_agg(json_build_object('id', e.id, 'campaign', c.code, 'date', e.spent_on, 'cat', e.cat, 'name', e.name,
        'amount', e.amount, 'units', e.units, 'vendor', e.vendor) order by e.spent_on, e.id), '[]'::json)
      from public.expenses e join public.campaigns c on c.id = e.campaign_id
      where c.sn_id is not null and e.paid),
    -- Đã sang Sơn Nga mà bên Lành không còn (đơn huỷ / về trạng thái chưa nhận tiền, chi bị xoá / chưa trả): Sơn Nga xoá dòng
    'gone', (select coalesce(json_agg(json_build_object('ref', i.ref, 'campaign', c.code)), '[]'::json)
      from public.sync_items i left join public.campaigns c on c.id = i.campaign_id
      where (i.ref like 'O:%' and not exists (select 1 from public.orders o join public.campaigns c2 on c2.id = o.campaign_id
               where o.code = substr(i.ref, 3) and o.status in ('da-nhan-tien', 'hoan-hang') and c2.sn_id is not null))
         or (i.ref like 'E:%' and not exists (select 1 from public.expenses e join public.campaigns c2 on c2.id = e.campaign_id
               where e.id = substr(i.ref, 3)::bigint and e.paid and c2.sn_id is not null))),
    'requests', (select coalesce(json_agg(json_build_object('id', r.id, 'campaign', c.code, 'campaign_name', c.name, 'sn_id', c.sn_id,
        'kind', r.kind, 'amount', r.amount, 'note', r.note, 'created_at', r.created_at, 'left', private.capital_left(c.id),
        'waiting', (select coalesce(json_agg(json_build_object('name', e.name, 'amount', e.amount, 'paid', e.paid)), '[]'::json)
                      from public.expenses e where e.id = any (r.expense_ids)),
        'plan', json_build_object('name', c.name, 'start', c.start_date, 'end', c.end_date, 'target', c.target_revenue,
                                  'budget', c.budget, 'sets', c.sets)) order by r.id), '[]'::json)
      from public.capital_requests r join public.campaigns c on c.id = r.campaign_id where r.status = 'cho-duyet'));
end $$;

create or replace function private.int0(p jsonb) returns integer
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'number' and (p #>> '{}')::numeric between 0 and 1000000 then trunc((p #>> '{}')::numeric)::integer else 0 end
$$;

-- 12. Đồng bộ: Sơn Nga báo lại (vốn, trạng thái chiến dịch, từng dòng, quyết định cấp vốn, lượt chạy) -------------
create or replace function public.sync_report(p_key text, p_data jsonb) returns json
language plpgsql security definer set search_path = '' as $$
declare d jsonb := coalesce(p_data, '{}'::jsonb); e jsonb; c public.campaigns; rq public.capital_requests; n integer := 0;
  v_sn text; v_st text; v_cap numeric;
begin
  if not private.sync_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(d) <> 'object' then raise exception 'bad_input' using errcode = 'P0001'; end if;

  -- Quyết định cấp vốn trước: duyệt yêu cầu "tạo" thì nối chiến dịch luôn
  for e in select x.value from jsonb_array_elements(case when jsonb_typeof(d->'decisions') = 'array' then d->'decisions' else '[]' end) x loop
    if coalesce(e->>'id', '') !~ '^[0-9]{1,18}$' or coalesce(e->>'status', '') not in ('da-duyet', 'tu-choi') then continue; end if;
    update public.capital_requests set status = e->>'status', decided_at = now(),
      decided_amount = case when e->>'status' = 'da-duyet' and jsonb_typeof(e->'amount') = 'number'
                            and (e->>'amount')::numeric between 0 and 2000000000 then trunc((e->>'amount')::numeric)::bigint end,
      reply = left(nullif(btrim(coalesce(e->>'reply', '')), ''), 300)
    where id = (e->>'id')::bigint and status = 'cho-duyet' returning * into rq;
    if found and rq.kind = 'tao' and rq.status = 'da-duyet' and coalesce(e->>'sn_id', '') ~ '^CD-[0-9]{4,}$'
       and not exists (select 1 from public.campaigns where sn_id = e->>'sn_id') then
      update public.campaigns set sn_id = e->>'sn_id',
        status = case when status = 'draft' and coalesce(start_date, current_date) <= (now() at time zone 'Asia/Ho_Chi_Minh')::date then 'running' else status end
      where id = rq.campaign_id and sn_id is null;
    end if;
  end loop;

  for e in select x.value from jsonb_array_elements(case when jsonb_typeof(d->'campaigns') = 'array' then d->'campaigns' else '[]' end) x loop
    select * into c from public.campaigns where code = e->>'code' for update;
    if not found then continue; end if;
    v_sn := coalesce(e->>'sn_id', '');
    if v_sn ~ '^CD-[0-9]{4,}$' and c.sn_id is null and not exists (select 1 from public.campaigns where sn_id = v_sn) then
      update public.campaigns set sn_id = v_sn where id = c.id;  -- nối một lần, không đổi sang chiến dịch khác
      c.sn_id := v_sn;
    end if;
    if c.sn_id is null or (v_sn <> '' and v_sn <> c.sn_id) then continue; end if;
    v_st := case when e->>'status' in ('draft', 'running', 'settled') then e->>'status' end;
    v_cap := case when jsonb_typeof(e->'capital') = 'number' and abs((e->>'capital')::numeric) < 1e12 then trunc((e->>'capital')::numeric) end;
    update public.campaigns set
      sn_capital = coalesce(v_cap::bigint, sn_capital),
      sn_status = coalesce(v_st, sn_status),
      sn_synced_at = now(),
      settled_at = case when v_st = 'settled' then coalesce(settled_at, now()) when status = 'settled' and v_st in ('draft', 'running') then null else settled_at end,
      status = case when v_st = 'settled' then 'settled' when status = 'settled' and v_st in ('draft', 'running') then 'closed' else status end
    where id = c.id;
  end loop;

  for e in select x.value from jsonb_array_elements(case when jsonb_typeof(d->'items') = 'array' then d->'items' else '[]' end) x loop
    n := n + 1;
    exit when n > 5000;
    if coalesce(e->>'ref', '') !~ '^(O:[A-Za-z0-9-]{3,30}|E:[0-9]{1,18})$' then continue; end if;
    if e->>'state' = 'xoa' then
      delete from public.sync_items where ref = e->>'ref';
    elsif e->>'state' in ('ok', 'cho-von', 'loi') then
      insert into public.sync_items (ref, campaign_id, state, message, updated_at)
      values (e->>'ref', (select id from public.campaigns where code = e->>'campaign'), e->>'state',
              left(nullif(btrim(coalesce(e->>'message', '')), ''), 300), now())
      on conflict (ref) do update set campaign_id = coalesce(excluded.campaign_id, public.sync_items.campaign_id),
        state = excluded.state, message = excluded.message, updated_at = now();
    end if;
  end loop;

  if jsonb_typeof(d->'run') = 'object' then
    insert into public.sync_runs (source, added, updated, deleted, failed, pending, message)
    values (case when d->'run'->>'source' in ('tab', 'nut', 'cron', 'duyet') then d->'run'->>'source' else 'nut' end,
      private.int0(d->'run'->'added'), private.int0(d->'run'->'updated'), private.int0(d->'run'->'deleted'),
      private.int0(d->'run'->'failed'), private.int0(d->'run'->'pending'), left(nullif(btrim(coalesce(d->'run'->>'message', '')), ''), 300));
    delete from public.sync_runs where id < (select id from public.sync_runs order by id desc offset 299 limit 1);
  end if;
  if d->>'unlock' = 'true' then delete from private.settings where key = 'sync_lock'; end if;
  return json_build_object('ok', true, 'at', now());
end $$;

-- 13. Quyền ------------------------------------------------------------------------------------
revoke all on function private.sync_ok(text) from public;
revoke all on function private.ship_by(text, text, text, integer, integer) from public;
revoke all on function private.camp_spent(bigint, bigint) from public;
revoke all on function private.capital_left(bigint, bigint) from public;
revoke all on function private.int0(jsonb) from public;
revoke all on function public.bo2_capreq_save(text, jsonb) from public;
revoke all on function public.bo2_capreq_cancel(text, bigint) from public;
revoke all on function public.sync_export(text, boolean) from public;
revoke all on function public.sync_report(text, jsonb) from public;
grant execute on function public.bo2_capreq_save(text, jsonb) to anon, service_role;
grant execute on function public.bo2_capreq_cancel(text, bigint) to anon, service_role;
grant execute on function public.sync_export(text, boolean) to anon, service_role;
grant execute on function public.sync_report(text, jsonb) to anon, service_role;
revoke execute on function public.bo2_capreq_save(text, jsonb), public.bo2_capreq_cancel(text, bigint),
  public.sync_export(text, boolean), public.sync_report(text, jsonb) from authenticated;
