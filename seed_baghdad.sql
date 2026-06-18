-- Demo pharmacy profiles (Baghdad areas)
insert into profiles (id, pharmacy_name, owner_name, phone, city, country, lat, lng, location_label) values
('9fd6ec40-b712-4e19-b2ca-0a759ce81df5','صيدلية الكرادة','أحمد كريم','9647801111101','بغداد','IQ',33.3030,44.4360,'الكرادة'),
('0b9dd5d2-08e9-4263-ac6e-7d55b9ea1dcd','صيدلية ساحة بيروت','مروان علي','9647801111102','بغداد','IQ',33.3340,44.4430,'ساحة بيروت'),
('eca2d4c5-c482-414c-86d7-deccf55fa365','صيدلية الكرخ','سيف حسن','9647801111103','بغداد','IQ',33.3150,44.3610,'الكرخ'),
('eb18ce69-5869-453a-a1c5-36978886e294','صيدلية الرصافة','حسن عبد','9647801111104','بغداد','IQ',33.3400,44.4220,'الرصافة')
on conflict (id) do nothing;

with net as (
  insert into networks (name, description, city, country, created_by)
  values ('صيدليات بغداد','شبكة تجريبية لمدينة بغداد','بغداد','IQ','7b46d954-178b-4448-864c-2575692dacb3')
  returning id
),
mem as (
  insert into network_members (network_id, profile_id, role, status)
  select net.id, v.pid::uuid, v.role, 'active'
  from net, (values
    ('7b46d954-178b-4448-864c-2575692dacb3','admin'),
    ('9fd6ec40-b712-4e19-b2ca-0a759ce81df5','member'),
    ('0b9dd5d2-08e9-4263-ac6e-7d55b9ea1dcd','member'),
    ('eca2d4c5-c482-414c-86d7-deccf55fa365','member'),
    ('eb18ce69-5869-453a-a1c5-36978886e294','member')
  ) as v(pid, role)
  returning 1
),
inv as (
  insert into network_invites (network_id, created_by, expires_at, max_uses)
  select net.id, '7b46d954-178b-4448-864c-2575692dacb3', now() + interval '90 days', 200
  from net
  returning token
),
posts_ins as (
  insert into posts (network_id, author_id, type, product_name, quantity, unit, price, original_price, currency, expiry_date, description, phone, status)
  select net.id, v.author::uuid, v.ptype, v.pname, v.qty, v.unit, v.price, v.orig, 'IQD', v.exp, v.descr, v.phone, 'active'
  from net, (values
    ('9fd6ec40-b712-4e19-b2ca-0a759ce81df5','offer','Augmentin 625mg — GSK',150,'علبة',12500::numeric,16000::numeric,(current_date + 20)::date,'قرب الانتهاء — للبيع بسعر مخفّض','9647801111101'),
    ('eca2d4c5-c482-414c-86d7-deccf55fa365','offer','Ventolin Inhaler — GSK',60,'علبة',5500::numeric,7000::numeric,(current_date + 25)::date,'كمية فائضة','9647801111103'),
    ('0b9dd5d2-08e9-4263-ac6e-7d55b9ea1dcd','offer','Paracetamol 500mg — Julphar',500,'علبة',2500::numeric,3500::numeric,(current_date + 75)::date,'عرض جملة','9647801111102'),
    ('9fd6ec40-b712-4e19-b2ca-0a759ce81df5','offer','Azithromycin 500mg — Pfizer',80,'علبة',8000::numeric,10000::numeric,(current_date + 50)::date,'فائض مخزون','9647801111101'),
    ('eca2d4c5-c482-414c-86d7-deccf55fa365','offer','Omeprazole 20mg — AstraZeneca',200,'علبة',4500::numeric,6000::numeric,(current_date + 130)::date,'صلاحية جيدة','9647801111103'),
    ('eb18ce69-5869-453a-a1c5-36978886e294','offer','Amlodipine 5mg — Pfizer',200,'علبة',3000::numeric,4000::numeric,(current_date + 220)::date,'سعر منافس','9647801111104'),
    ('0b9dd5d2-08e9-4263-ac6e-7d55b9ea1dcd','wanted','Insulin Lantus',30,'علبة',null::numeric,null::numeric,null::date,'مطلوب بشكل عاجل','9647801111102'),
    ('eb18ce69-5869-453a-a1c5-36978886e294','wanted','Metformin 850mg',100,'علبة',null::numeric,null::numeric,null::date,'مطلوب لتغطية نقص','9647801111104')
  ) as v(author, ptype, pname, qty, unit, price, orig, exp, descr, phone)
  returning 1
)
select (select token from inv) as invite_token, (select id from net) as network_id;
