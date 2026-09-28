# TIMES Prediction CMS

Next.js + Supabase realtime prediction board. The supplied TIMES image is included as the frontend background.

## 1. Supabase
1. Create a free Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Authentication > Users > Add user, create the CMS admin email/password.
4. Project Settings > API: copy Project URL and anon/public key.

## 2. Local setup
```bash
npm install
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```
Frontend: http://localhost:3000
CMS: http://localhost:3000/admin

## 3. GitHub + Vercel
Create an empty GitHub repository, then from this folder:
```bash
git init
git add .
git commit -m "Initial TIMES prediction CMS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```
In Vercel choose Add New > Project > import that GitHub repo. Add the two environment variables from `.env.example`, then Deploy.

## Notes
- Frontend reads are public. Writes require a Supabase authenticated admin.
- Realtime is enabled for users/events/predictions.
- Avatar currently accepts an image URL for simplicity. Supabase Storage upload can be added later.
