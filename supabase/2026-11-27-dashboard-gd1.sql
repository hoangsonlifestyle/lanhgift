-- Dashboard Lành giai đoạn 1: chiến dịch, nguồn đơn, đối soát kế hoạch và thực nhận, chi phí, nhật ký.
-- Chỉ bổ sung. place_order nhận thêm p_channel, p_ref (mặc định null) nên trang web bản cũ vẫn đặt được.
-- bo_orders, bo_set_status, bo_set_ship giữ nguyên cho trang /quan-ly bản cũ.

-- 1. Bảng mới ---------------------------------------------------------------
create table public.campaigns (
  id bigint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  status text not null default 'draft' check (status in ('draft', 'running', 'closed', 'settled')),
  start_date date,
  end_date date,
  target_revenue bigint check (target_revenue is null or target_revenue between 0 and 100000000000),
  budget jsonb not null default '{}'::jsonb check (jsonb_typeof(budget) = 'object'),
  sets jsonb not null default '[]'::jsonb check (jsonb_typeof(sets) = 'array'),
  note text check (note is null or char_length(note) <= 500),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.sources (
  key text primary key check (key ~ '^[a-z0-9-]{2,30}$'),
  label text not null check (char_length(label) between 1 and 40),
  sort integer not null default 100,
  active boolean not null default true,
  auto boolean not null default false
);

create table public.expenses (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id),
  spent_on date not null,
  cat text not null check (cat in ('nhap', 'baobi', 'quangcao', 'vanchuyen', 'khac')),
  name text not null check (char_length(name) between 2 and 120),
  amount bigint not null check (amount between 1 and 10000000000),
  units integer check (units is null or units between 1 and 1000000),
  vendor text check (vendor is null or char_length(vendor) <= 80),
  paid boolean not null default true,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_campaign_idx on public.expenses (campaign_id, spent_on desc);

create table public.audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  entity text not null,
  entity_id bigint,
  action text not null,
  data jsonb
);
create index audit_entity_idx on public.audit (entity, entity_id);

alter table public.campaigns enable row level security;
alter table public.sources enable row level security;
alter table public.expenses enable row level security;
alter table public.audit enable row level security;
revoke all on public.campaigns, public.sources, public.expenses, public.audit from anon, authenticated;

insert into public.sources (key, label, sort, auto) values
  ('web', 'Web', 10, true), ('google', 'Google', 20, true), ('google-ads', 'Google Ads', 30, true),
  ('facebook', 'Facebook', 40, false), ('zalo', 'Zalo', 50, false), ('instagram', 'Instagram', 60, false),
  ('tiktok', 'TikTok', 70, false), ('doanh-nghiep', 'Doanh nghiệp', 80, false), ('nguoi-quen', 'Người quen', 90, false),
  ('ban-be', 'Bạn bè giới thiệu', 100, false), ('khach-cu', 'Khách cũ', 110, false), ('khac', 'Khác', 120, false);

-- 2. Cột mới cho đơn ---------------------------------------------------------
alter table public.orders
  add column campaign_id bigint references public.campaigns(id),
  add column channel text references public.sources(key),
  add column ref text check (ref is null or char_length(ref) <= 120),
  add column origin text not null default 'web' check (origin in ('web', 'tay')),
  add column items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  add column pay_method text not null default 'cod' check (pay_method in ('cod', 'ck', 'tien-mat')),
  add column carrier text check (carrier is null or char_length(carrier) <= 40),
  add column got_amount integer check (got_amount is null or got_amount between 0 and 2000000000),
  add column ship_cost integer check (ship_cost is null or ship_cost between 0 and 2000000),
  add column recon_note text check (recon_note is null or char_length(recon_note) <= 200),
  add column received_at timestamptz;

-- Đơn nhập tay: có thể nhiều set, giá riêng (doanh nghiệp), khách lấy tại chỗ không có địa chỉ, số lượng lớn.
alter table public.orders
  drop constraint orders_set_code_check,
  add constraint orders_set_code_check check (char_length(set_code) between 2 and 40),
  drop constraint orders_status_check,
  add constraint orders_status_check check (status in ('moi', 'da-xac-nhan', 'dang-giao', 'da-giao', 'da-nhan-tien', 'huy', 'hoan-hang')),
  alter column phone drop not null,
  drop constraint orders_phone_check,
  add constraint orders_phone_check check (phone is null or phone ~ '^0[0-9]{9,10}$'),
  alter column address drop not null,
  drop constraint orders_address_check,
  add constraint orders_address_check check (address is null or char_length(address) between 2 and 300),
  drop constraint orders_qty_check,
  add constraint orders_qty_check check (qty between 1 and 5000),
  drop constraint orders_total_check,
  add constraint orders_total_check check (total >= 0),
  drop constraint orders_unit_price_check,
  add constraint orders_unit_price_check check (unit_price >= 0);
create index orders_campaign_idx on public.orders (campaign_id, created_at desc);

insert into public.campaigns (code, name, status, sets) values ('tet-2027', 'Tết 2027', 'running',
  '[{"code":"sum-vay","name":"Set Sum Vầy","price":399000,"qty":null,"web":true},{"code":"doan-vien","name":"Set Đoàn Viên","price":599000,"qty":null,"web":true}]'::jsonb);
update public.orders set
  campaign_id = coalesce(campaign_id, (select id from public.campaigns where code = 'tet-2027')),
  channel = coalesce(channel, 'web'),
  items = jsonb_build_array(jsonb_build_object('code', set_code, 'name', set_name, 'qty', qty, 'price', unit_price))
where items = '[]'::jsonb;

-- 3. Hàm phụ -------------------------------------------------------------------
create or replace function private.running_campaign() returns bigint
language sql stable security definer set search_path = '' as $$
  select id from public.campaigns where status = 'running' order by start_date desc nulls last, id desc limit 1
$$;

create or replace function private.camp_editable(p_id bigint) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_id is not null and exists (select 1 from public.campaigns where id = p_id and status = 'settled') then
    raise exception 'locked' using errcode = 'P0001';
  end if;
end $$;

-- Số tiền: số nguyên không âm, null khi để trống.
create or replace function private.money_or_null(p jsonb, p_max bigint) returns integer
language plpgsql immutable set search_path = '' as $$
declare n numeric;
begin
  if p is null or jsonb_typeof(p) = 'null' or (jsonb_typeof(p) = 'string' and btrim(p #>> '{}') = '') then return null; end if;
  begin n := (p #>> '{}')::numeric;
  exception when others then raise exception 'invalid_money' using errcode = 'P0001'; end;
  if n < 0 or n > p_max or n <> trunc(n) then raise exception 'invalid_money' using errcode = 'P0001'; end if;
  return n::integer;
end $$;

-- Dòng hàng của đơn: [{code, name, qty, price}], tên và giá mặc định lấy từ set của chiến dịch.
create or replace function private.norm_items(p_items jsonb, p_campaign bigint)
returns table (items jsonb, set_code text, set_name text, qty integer, unit_price integer, total integer)
language plpgsql stable security definer set search_path = '' as $$
declare e jsonb; v_out jsonb := '[]'::jsonb; v_code text; v_name text; v_qty integer; v_price integer;
  v_sets jsonb; v_set jsonb; t_qty integer := 0; t_total bigint := 0; n integer := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  select c.sets into v_sets from public.campaigns c where c.id = p_campaign;
  for e in select x.value from jsonb_array_elements(p_items) x loop
    if jsonb_typeof(e) <> 'object' then raise exception 'invalid_items' using errcode = 'P0001'; end if;
    v_code := e->>'code';
    if v_code is null or v_code !~ '^[a-z0-9-]{2,40}$' then raise exception 'invalid_items' using errcode = 'P0001'; end if;
    v_set := null;
    select s.value into v_set from jsonb_array_elements(coalesce(v_sets, '[]'::jsonb)) s where s.value->>'code' = v_code limit 1;
    v_name := coalesce(nullif(btrim(e->>'name'), ''), v_set->>'name');
    begin
      v_qty := (e->>'qty')::integer;
      v_price := coalesce((e->>'price')::integer, (v_set->>'price')::integer);
    exception when others then raise exception 'invalid_items' using errcode = 'P0001';
    end;
    if v_name is null or char_length(v_name) > 80 or v_qty is null or v_qty < 1 or v_qty > 5000
       or v_price is null or v_price < 0 or v_price > 100000000 then
      raise exception 'invalid_items' using errcode = 'P0001';
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('code', v_code, 'name', v_name, 'qty', v_qty, 'price', v_price));
    t_qty := t_qty + v_qty; t_total := t_total + v_qty::bigint * v_price; n := n + 1;
  end loop;
  if t_qty > 5000 or t_total > 2000000000 then raise exception 'invalid_items' using errcode = 'P0001'; end if;
  items := v_out; qty := t_qty; total := t_total::integer;
  if n = 1 then
    set_code := v_out->0->>'code'; set_name := v_out->0->>'name'; unit_price := (v_out->0->>'price')::integer;
  else
    set_code := 'nhieu-set';
    select string_agg((x.value->>'name') || ' × ' || (x.value->>'qty'), ' + ') into set_name from jsonb_array_elements(v_out) x;
    unit_price := round(t_total::numeric / t_qty)::integer;
  end if;
  return next;
end $$;

-- 4. Nhận đơn từ web: thêm nguồn đơn (p_channel, p_ref) và gắn chiến dịch đang bán ---------
drop function public.place_order(text, text, text, text, integer, text, text, text, text);
create function public.place_order(p_name text, p_phone text, p_address text, p_set text, p_qty integer,
  p_note text default null, p_source text default null, p_hp text default null, p_zone text default null,
  p_channel text default null, p_ref text default null)
returns json language plpgsql security definer set search_path = '' as $function$
declare v_phone text; v_name text; v_addr text; v_note text; v_set record; v_code text; v_prev record; v_ship integer; v_ch text;
begin
  if coalesce(p_hp, '') <> '' then raise exception 'spam' using errcode = 'P0001'; end if;
  v_name := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_addr := btrim(regexp_replace(coalesce(p_address, ''), '\s+', ' ', 'g'));
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if v_phone like '84%' and char_length(v_phone) = 11 then v_phone := '0' || substr(v_phone, 3); end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'invalid_name' using errcode = 'P0001'; end if;
  if v_phone !~ '^0[35789][0-9]{8}$' then raise exception 'invalid_phone' using errcode = 'P0001'; end if;
  if char_length(v_addr) < 8 or char_length(v_addr) > 300 then raise exception 'invalid_address' using errcode = 'P0001'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 50 then raise exception 'invalid_qty' using errcode = 'P0001'; end if;
  -- trang bản cũ còn mở trong trình duyệt khách không gửi p_zone: vẫn nhận đơn, phí ship báo sau
  if p_zone is not null and p_zone not in ('hcm', 'tinh') then raise exception 'invalid_zone' using errcode = 'P0001'; end if;
  if v_note is not null and char_length(v_note) > 300 then v_note := left(v_note, 300); end if;
  select * into v_set from private.set_price(p_set);
  if v_set.price is null then raise exception 'invalid_set' using errcode = 'P0001'; end if;
  -- nguồn đơn chỉ nhận các nguồn trình duyệt tự nhận ra được; còn lại tính là Web
  v_ch := case when p_channel in ('web', 'google', 'google-ads', 'facebook', 'zalo', 'instagram', 'tiktok') then p_channel else 'web' end;
  -- bấm gửi hai lần: trả lại đúng đơn vừa tạo
  select code, total, ship_fee, cod_total, zone into v_prev from public.orders
   where phone = v_phone and set_code = p_set and qty = p_qty and created_at > now() - interval '3 minutes'
   order by created_at desc limit 1;
  if found then
    return json_build_object('code', v_prev.code, 'total', v_prev.total, 'ship_fee', v_prev.ship_fee,
                             'cod_total', v_prev.cod_total, 'zone', v_prev.zone, 'dup', true);
  end if;
  -- chặn gửi ồ ạt
  if (select count(*) from public.orders where created_at > now() - interval '10 minutes') >= 40
     or (select count(*) from public.orders where phone = v_phone and created_at > now() - interval '1 hour') >= 6 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  v_ship := private.ship_fee(p_zone, p_qty);
  loop
    v_code := 'L' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'DDMM') || '-'
              || upper(substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 4));
    exit when not exists (select 1 from public.orders where code = v_code);
  end loop;
  insert into public.orders (code, name, phone, address, set_code, set_name, qty, unit_price, total, note, source, zone, ship_fee,
                             campaign_id, channel, ref, origin, items)
  values (v_code, v_name, v_phone, v_addr, p_set, v_set.name, p_qty, v_set.price, v_set.price * p_qty, v_note, left(p_source, 40), p_zone, v_ship,
          private.running_campaign(), v_ch, left(nullif(btrim(coalesce(p_ref, '')), ''), 120), 'web',
          jsonb_build_array(jsonb_build_object('code', p_set, 'name', v_set.name, 'qty', p_qty, 'price', v_set.price)));
  return json_build_object('code', v_code, 'total', v_set.price * p_qty, 'ship_fee', v_ship,
                           'cod_total', case when v_ship is null then null else v_set.price * p_qty + v_ship end,
                           'zone', p_zone, 'set', v_set.name);
end $function$;
revoke all on function public.place_order(text, text, text, text, integer, text, text, text, text, text, text) from public;
grant execute on function public.place_order(text, text, text, text, integer, text, text, text, text, text, text) to anon, authenticated, service_role;

-- 5. Dashboard: đọc toàn bộ dữ liệu ------------------------------------------------
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
    'at', now());
end $$;

-- 6. Dashboard: tạo đơn nhập tay (p_id null) hoặc sửa đơn -------------------------------
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
      campaign_id, channel, origin, items, pay_method, carrier, got_amount, ship_cost, recon_note, received_at, updated_at)
    values (v.code, v.created_at, v.name, v.phone, v.address, v.set_code, v.set_name, v.qty, v.unit_price, v.total, v.note, v.status, v.zone, v.ship_fee,
      v.campaign_id, v.channel, v.origin, v.items, v.pay_method, v.carrier, v.got_amount, v.ship_cost, v.recon_note, v.received_at, v.updated_at)
    returning * into v;
  else
    update public.orders set name = v.name, phone = v.phone, address = v.address, set_code = v.set_code, set_name = v.set_name,
      qty = v.qty, unit_price = v.unit_price, total = v.total, note = v.note, status = v.status, zone = v.zone, ship_fee = v.ship_fee,
      campaign_id = v.campaign_id, channel = v.channel, items = v.items, pay_method = v.pay_method, carrier = v.carrier,
      got_amount = v.got_amount, ship_cost = v.ship_cost, recon_note = v.recon_note, received_at = v.received_at, updated_at = v.updated_at
    where id = v.id returning * into v;
  end if;
  insert into public.audit (entity, entity_id, action, data) values ('order', v.id, case when v_new then 'create' else 'update' end, d);
  return v;
end $$;

-- 7. Dashboard: chi phí -------------------------------------------------------------
create or replace function public.bo2_expense_save(p_key text, p_id bigint, p_data jsonb) returns public.expenses
language plpgsql security definer set search_path = '' as $$
declare v public.expenses; d jsonb := coalesce(p_data, '{}'::jsonb); v_new boolean := p_id is null; v_camp bigint; n integer;
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

create or replace function public.bo2_expense_delete(p_key text, p_id bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
declare v public.expenses;
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into v from public.expenses where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0001'; end if;
  perform private.camp_editable(v.campaign_id);
  delete from public.expenses where id = p_id;
  insert into public.audit (entity, entity_id, action, data) values ('expense', p_id, 'delete', to_jsonb(v));
  return p_id;
end $$;

-- 8. Dashboard: chiến dịch -------------------------------------------------------------
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

-- 9. Dashboard: danh sách nguồn đơn (thêm, đổi tên, ẩn; không xoá) -----------------------
create or replace function public.bo2_sources_save(p_key text, p_list jsonb) returns json
language plpgsql security definer set search_path = '' as $$
declare e jsonb; v_key text; v_label text;
begin
  if not private.bo_ok(p_key) then raise exception 'forbidden' using errcode = '42501'; end if;
  if jsonb_typeof(p_list) <> 'array' or jsonb_array_length(p_list) > 40 then raise exception 'bad_input' using errcode = 'P0001'; end if;
  for e in select x.value from jsonb_array_elements(p_list) x loop
    v_key := e->>'key'; v_label := btrim(coalesce(e->>'label', ''));
    if v_key is null or v_key !~ '^[a-z0-9-]{2,30}$' or char_length(v_label) < 1 or char_length(v_label) > 40 then
      raise exception 'invalid_source' using errcode = 'P0001';
    end if;
    insert into public.sources (key, label, sort, active)
    values (v_key, v_label, coalesce(private.money_or_null(e->'sort', 10000), 100), coalesce((e->>'active')::boolean, true))
    on conflict (key) do update set label = excluded.label, sort = excluded.sort, active = excluded.active;
  end loop;
  insert into public.audit (entity, action, data) values ('sources', 'save', p_list);
  return (select coalesce(json_agg(s order by s.sort, s.key), '[]'::json) from public.sources s);
end $$;

-- 10. Quyền gọi hàm: chỉ qua khoá quản lý ---------------------------------------------
revoke all on function public.bo2_data(text) from public;
revoke all on function public.bo2_order_save(text, bigint, jsonb) from public;
revoke all on function public.bo2_expense_save(text, bigint, jsonb) from public;
revoke all on function public.bo2_expense_delete(text, bigint) from public;
revoke all on function public.bo2_campaign_save(text, bigint, jsonb) from public;
revoke all on function public.bo2_sources_save(text, jsonb) from public;
grant execute on function public.bo2_data(text) to anon, service_role;
grant execute on function public.bo2_order_save(text, bigint, jsonb) to anon, service_role;
grant execute on function public.bo2_expense_save(text, bigint, jsonb) to anon, service_role;
grant execute on function public.bo2_expense_delete(text, bigint) to anon, service_role;
grant execute on function public.bo2_campaign_save(text, bigint, jsonb) to anon, service_role;
grant execute on function public.bo2_sources_save(text, jsonb) to anon, service_role;
revoke all on function private.running_campaign() from public;
revoke all on function private.camp_editable(bigint) from public;
revoke all on function private.money_or_null(jsonb, bigint) from public;
revoke all on function private.norm_items(jsonb, bigint) from public;
-- Supabase tự cấp quyền cho authenticated khi tạo hàm: thu lại, chỉ anon (qua máy chủ Vercel) và service_role được gọi.
revoke execute on function public.bo2_data(text), public.bo2_order_save(text, bigint, jsonb), public.bo2_expense_save(text, bigint, jsonb),
  public.bo2_expense_delete(text, bigint), public.bo2_campaign_save(text, bigint, jsonb), public.bo2_sources_save(text, jsonb) from authenticated;
