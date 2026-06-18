-- Mark demo pharmacies so they read as samples, not real shops
update profiles set pharmacy_name = pharmacy_name || ' (نموذج)'
where id in (
  '9fd6ec40-b712-4e19-b2ca-0a759ce81df5',
  '0b9dd5d2-08e9-4263-ac6e-7d55b9ea1dcd',
  'eca2d4c5-c482-414c-86d7-deccf55fa365',
  'eb18ce69-5869-453a-a1c5-36978886e294'
) and pharmacy_name not like '%نموذج%';

-- Replace placeholder images with real product photos
delete from post_media where post_id in (
  select id from posts where network_id = 'bc2cd13b-d9c6-496d-9fc8-f8cd8554ec6c'
);

with imgs as (
  select url, n from unnest(array[
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&q=80',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&q=80',
    'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&q=80',
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&q=80'
  ]) with ordinality as t(url, n)
),
op as (
  select id, row_number() over (order by created_at) as rn
  from posts
  where network_id = 'bc2cd13b-d9c6-496d-9fc8-f8cd8554ec6c' and type = 'offer'
)
insert into post_media (post_id, type, storage_url)
select op.id, 'image', imgs.url
from op join imgs on imgs.n = ((op.rn - 1) % 5) + 1
returning post_id, storage_url;
