
from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'yfinance-api',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/price', methods=['GET'])
def get_current_price():
    ticker = request.args.get('ticker')
    if not ticker:
        return jsonify({'error': 'ticker parameter required'}), 400
    
    try:
        stock = yf.Ticker(ticker.upper())
        info = stock.info
        
        # Try different price fields
        price = info.get('regularMarketPrice') or info.get('currentPrice') or info.get('previousClose')
        
        if not price:
            return jsonify({'error': f'No price data available for {ticker}'}), 404
            
        return jsonify({
            'ticker': ticker.upper(),
            'price': float(price),
            'regularMarketPrice': float(price),
            'timestamp': datetime.now().isoformat(),
            'source': 'yfinance'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def get_historical_data():
    ticker = request.args.get('ticker')
    start = request.args.get('start')
    end = request.args.get('end') 
    interval = request.args.get('interval', '1d')
    
    if not ticker:
        return jsonify({'error': 'ticker parameter required'}), 400
    
    try:
        stock = yf.Ticker(ticker.upper())
        
        # Set default date range if not provided
        if not start:
            start = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end:
            end = datetime.now().strftime('%Y-%m-%d')
            
        hist = stock.history(start=start, end=end, interval=interval)
        
        if hist.empty:
            return jsonify({'error': f'No historical data for {ticker}'}), 404
            
        data = []
        for index, row in hist.iterrows():
            data.append({
                'timestamp': index.isoformat(),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume'])
            })
            
        return jsonify({
            'ticker': ticker.upper(),
            'interval': interval,
            'start': start,
            'end': end,
            'data': data,
            'source': 'yfinance'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=False)
