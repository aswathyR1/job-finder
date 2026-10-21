# JobFinder

A free job search app built with React. Type a job title and location and get matching jobs from LinkedIn, Indeed, Glassdoor, ZipRecruiter and more. Click a job to see its details and apply on the original posting.

- **Free:** uses the JSearch API's free Basic plan, which stops at its monthly limit instead of charging.
- **Private key:** your API key is saved only in your browser (Settings ⚙️), never in the code.
- **Demo mode:** try the UI without a key.
- Filters for date posted, job type, remote, "title must match", and sorting. Light and dark mode. Works on phones.

## Get a free API key

1. Sign up at https://rapidapi.com and open the **JSearch** API.
2. Subscribe to the **Basic (free)** plan.
3. Copy your `X-RapidAPI-Key`, open the app, click ⚙️ and paste it.

## Run locally

```bash
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

## Put it on GitHub Pages

1. Create a new **public** repository on GitHub, e.g. `job-finder`.
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "JobFinder app"
   git branch -M main
   git remote add origin https://github.com/<your-username>/job-finder.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**, and under **Source** choose **GitHub Actions**.
4. Wait about a minute (see the **Actions** tab). Your site is live at
   `https://<your-username>.github.io/job-finder/`

Every push to `main` redeploys automatically.

> Note: anyone who visits your site needs their own API key (or can use demo mode). Your key stays in your browser only.
