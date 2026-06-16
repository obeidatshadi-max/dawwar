-- Profiles (one per auth user)
CREATE TABLE profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pharmacy_name  text NOT NULL,
  owner_name     text NOT NULL,
  phone          text NOT NULL,
  city           text NOT NULL,
  country        text NOT NULL CHECK (country IN ('JO', 'IQ')),
  avatar_url     text,
  lat            float,
  lng            float,
  location_label text,
  created_at     timestamptz DEFAULT now()
);

-- Networks
CREATE TABLE networks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  city        text,
  country     text CHECK (country IN ('JO', 'IQ')),
  created_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- Network members
CREATE TABLE network_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id  uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  invited_by  uuid REFERENCES profiles(id),
  status      text NOT NULL CHECK (status IN ('pending', 'active')) DEFAULT 'active',
  joined_at   timestamptz DEFAULT now(),
  UNIQUE (network_id, profile_id)
);

-- Invite tokens
CREATE TABLE network_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  network_id  uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  created_by  uuid REFERENCES profiles(id),
  expires_at  timestamptz NOT NULL,
  max_uses    int DEFAULT 50,
  uses_count  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- Posts
CREATE TABLE posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     uuid NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  author_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('offer', 'wanted')),
  product_name   text NOT NULL,
  quantity       int NOT NULL CHECK (quantity > 0),
  unit           text NOT NULL,
  price          numeric(10,3),
  original_price numeric(10,3),
  currency       text CHECK (currency IN ('JOD', 'IQD')),
  expiry_date    date,
  description    text,
  phone          text NOT NULL,
  status         text NOT NULL CHECK (status IN ('active', 'sold', 'closed')) DEFAULT 'active',
  created_at     timestamptz DEFAULT now()
);

-- Post media (images + voice notes)
CREATE TABLE post_media (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('image', 'voice')),
  storage_url text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- Messages (DMs linked to a post)
CREATE TABLE messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  sender_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body         text,
  media_url    text,
  media_type   text CHECK (media_type IN ('image', 'voice')),
  read_at      timestamptz,
  created_at   timestamptz DEFAULT now()
);
