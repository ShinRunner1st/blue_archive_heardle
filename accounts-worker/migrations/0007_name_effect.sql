-- Name effects (docs/plan.md, "Cosmetics people see, and moving ones",
-- step 2): how the profile's name is drawn on its card, a pick like the
-- banner and frame. Existing profiles start with the plain one, the
-- list's default, as a page that never picked one sends.
ALTER TABLE profiles ADD COLUMN name_effect TEXT NOT NULL DEFAULT 'none';
