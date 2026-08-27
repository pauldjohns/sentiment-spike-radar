
# yfinance Stock Price API

A simple Flask API that provides current and historical stock price data using the yfinance library.

## Endpoints

- `GET /health` - Health check
- `GET /price?ticker=AAPL` - Get current price for a ticker
- `GET /history?ticker=AAPL&start=2024-01-01&end=2024-01-31&interval=1d` - Get historical data

## Deployment Options

### Option 1: Railway.app
1. Create account at railway.app
2. Connect your GitHub repo
3. Deploy this folder
4. Copy the deployment URL

### Option 2: Render.com
1. Create account at render.com
2. Create a new Web Service
3. Connect your GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `gunicorn app:app`
6. Deploy and copy the URL

### Option 3: Fly.io
1. Install flyctl CLI
2. Run `fly launch` in this directory
3. Deploy with `fly deploy`
4. Get URL with `fly info`

## Configure Supabase

Once deployed, add the URL to your Supabase secrets:
1. Go to Supabase Dashboard → Settings → Edge Functions
2. Add secret: `YFINANCE_API_URL` = `https://your-service-url.com`

## Test the API

```bash
curl "https://your-service-url.com/price?ticker=AAPL"
curl "https://your-service-url.com/history?ticker=AAPL&start=2024-01-01&end=2024-01-31"
```
