-- Enable RLS on all tables
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;

-- Helper: returns network_ids the current user belongs to
CREATE OR REPLACE FUNCTION my_network_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT network_id FROM network_members
  WHERE profile_id = auth.uid() AND status = 'active';
$$;

-- PROFILES: user sees/edits own profile only
CREATE POLICY "profiles: own read"   ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: own insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (id = auth.uid());

-- Also allow members to see other members' profiles (for post cards, DMs)
CREATE POLICY "profiles: network peer read" ON profiles FOR SELECT USING (
  id IN (
    SELECT profile_id FROM network_members
    WHERE network_id IN (SELECT my_network_ids())
  )
);

-- NETWORKS: members can read their networks; creator can update
CREATE POLICY "networks: member read"    ON networks FOR SELECT USING (id IN (SELECT my_network_ids()));
CREATE POLICY "networks: any insert"     ON networks FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "networks: admin update"   ON networks FOR UPDATE USING (
  id IN (SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin')
);

-- NETWORK_MEMBERS: members see their own network's members; admins can insert/delete
CREATE POLICY "members: read own networks" ON network_members FOR SELECT USING (
  network_id IN (SELECT my_network_ids())
);
CREATE POLICY "members: join via token"    ON network_members FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "members: admin delete"      ON network_members FOR DELETE USING (
  network_id IN (
    SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin'
  )
);

-- NETWORK_INVITES: admins manage; anyone can read to validate token
CREATE POLICY "invites: public read"   ON network_invites FOR SELECT USING (true);
CREATE POLICY "invites: admin insert"  ON network_invites FOR INSERT WITH CHECK (
  network_id IN (
    SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "invites: admin update"  ON network_invites FOR UPDATE USING (
  network_id IN (
    SELECT network_id FROM network_members WHERE profile_id = auth.uid() AND role = 'admin'
  )
);

-- POSTS: visible to network members; authors can insert/update
CREATE POLICY "posts: member read"    ON posts FOR SELECT USING (network_id IN (SELECT my_network_ids()));
CREATE POLICY "posts: author insert"  ON posts FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "posts: author update"  ON posts FOR UPDATE USING (author_id = auth.uid());

-- POST_MEDIA: same network visibility as posts
CREATE POLICY "post_media: member read"   ON post_media FOR SELECT USING (
  post_id IN (SELECT id FROM posts WHERE network_id IN (SELECT my_network_ids()))
);
CREATE POLICY "post_media: author insert" ON post_media FOR INSERT WITH CHECK (
  post_id IN (SELECT id FROM posts WHERE author_id = auth.uid())
);

-- MESSAGES: sender and recipient only
CREATE POLICY "messages: participant read"   ON messages FOR SELECT USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
CREATE POLICY "messages: sender insert"      ON messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages: recipient update"   ON messages FOR UPDATE USING (recipient_id = auth.uid());

-- STORAGE POLICIES (run after creating the post-media bucket)
CREATE POLICY "storage: auth upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "storage: auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'post-media');
