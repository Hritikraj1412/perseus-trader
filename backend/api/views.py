import random
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile, Portfolio, Transaction, Watchlist
import yfinance as yf

# --- NEW AUTHENTICATION FLOW ---

class RegisterStep1View(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({'error': 'All fields are required'}, status=400)

        if User.objects.filter(username=username).exists():
            # If user exists but is inactive, allow them to request a new OTP
            user = User.objects.get(username=username)
            if user.is_active:
                return Response({'error': 'Username already taken'}, status=400)
            user.email = email
            user.set_password(password)
            user.save()
        else:
            # Create inactive user
            user = User.objects.create_user(username=username, email=email, password=password)
            user.is_active = False  # Lock account until OTP is verified
            user.save()

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        
        user_profile, _ = UserProfile.objects.get_or_create(user=user)
        user_profile.otp = otp_code
        user_profile.otp_created_at = timezone.now()
        user_profile.balance = 10000.00 # Initial capital
        user_profile.save()

        # Send Real OTP Email
        send_mail(
            subject='Perseus Trader - Registration OTP',
            message=f'Welcome {user.username},\n\nYour registration verification code is: {otp_code}\n\nThis code expires in 5 minutes.',
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        return Response({'message': 'OTP sent to your email.'})

class RegisterStep2View(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password') # Passed from frontend to include in email
        otp_input = request.data.get('otp')

        try:
            user = User.objects.get(username=username)
            user_profile = UserProfile.objects.get(user=user)
        except (User.DoesNotExist, UserProfile.DoesNotExist):
            return Response({'error': 'User not found'}, status=404)

        if not user_profile.otp or user_profile.otp != otp_input:
            return Response({'error': 'Invalid OTP code'}, status=400)

        if user_profile.otp_created_at and timezone.now() > user_profile.otp_created_at + timedelta(minutes=5):
            return Response({'error': 'OTP has expired. Please register again.'}, status=400)

        # Activate User
        user.is_active = True
        user.save()
        
        user_profile.otp = None
        user_profile.save()

        # Send Welcome Email with Credentials
        send_mail(
            subject='Perseus Trader - Account Created Successfully',
            message=f'Congratulations {user.username}!\n\nYour institutional trading account has been fully verified and activated.\n\nYour Credentials:\nUsername: {user.username}\nPassword: {password}\n\nPlease keep these safe.',
            from_email=None,
            recipient_list=[user.email],
            fail_silently=False,
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username
        })

class SimpleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Invalid credentials or unverified account'}, status=400)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'username': user.username
        })

# --- KEEP ALL YOUR OTHER VIEWS BELOW THIS EXACTLY THE SAME ---
# (StockPriceView, StockHistoryView, TradeView, PortfolioView, etc.)

class StockPriceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, symbol):
        try:
            stock = yf.Ticker(symbol.upper())
            todays_data = stock.history(period='1d')
            if todays_data.empty:
                return Response({'error': 'Stock symbol not found'}, status=404)
            
            current_price = todays_data['Close'].iloc[-1]
            return Response({
                'symbol': symbol.upper(),
                'price': round(float(current_price), 2)
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class StockHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, symbol):
        period = request.GET.get('period', '1mo')
        interval = request.GET.get('interval', '1d')
        try:
            stock = yf.Ticker(symbol.upper())
            hist = stock.history(period=period, interval=interval)
            if hist.empty:
                return Response({'error': 'No historical data found'}, status=404)
            
            latest = hist.iloc[-1]
            day_high = round(float(latest['High']), 2)
            day_low = round(float(latest['Low']), 2)
            volume = int(latest['Volume'])
            current_price = round(float(latest['Close']), 2)
            
            price_change = 0.0
            percent_change = 0.0
            if len(hist) > 1:
                prev_close = hist.iloc[-2]['Close']
                price_change = round(current_price - prev_close, 2)
                percent_change = round((price_change / prev_close) * 100, 2)

            dates = []
            prices = []
            ohlc_data = []
            raw_data = []

            hist_sorted = hist.iloc[::-1]
            for index, row in hist_sorted.iterrows():
                date_str = index.strftime('%Y-%m-%d')
                dates.insert(0, date_str)
                close_p = round(float(row['Close']), 2)
                open_p = round(float(row['Open']), 2)
                high_p = round(float(row['High']), 2)
                low_p = round(float(row['Low']), 2)
                
                prices.insert(0, close_p)
                ohlc_data.insert(0, {'x': date_str, 'o': open_p, 'h': high_p, 'l': low_p, 'c': close_p})
                
                raw_data.append({
                    'date': date_str,
                    'open': open_p,
                    'high': high_p,
                    'low': low_p,
                    'close': close_p,
                    'volume': int(row['Volume']),
                    'dividends': float(row.get('Dividends', 0)),
                    'stock_splits': float(row.get('Stock Splits', 0))
                })

            return Response({
                'symbol': symbol.upper(),
                'current_price': current_price,
                'day_high': day_high,
                'day_low': day_low,
                'volume': volume,
                'price_change': price_change,
                'percent_change': percent_change,
                'dates': dates,
                'prices': prices,
                'ohlc': ohlc_data,
                'raw_data': raw_data
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

class TradeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        symbol = request.data.get('symbol', '').upper()
        action = request.data.get('action', '').upper()
        try:
            shares = float(request.data.get('shares', 0))
        except ValueError:
            return Response({'error': 'Invalid shares quantity'}, status=400)

        if not symbol or action not in ['BUY', 'SELL'] or shares <= 0:
            return Response({'error': 'Invalid request parameters. Provide symbol, action (BUY/SELL), and shares.'}, status=400)

        try:
            stock = yf.Ticker(symbol)
            todays_data = stock.history(period='1d')
            if todays_data.empty:
                return Response({'error': 'Stock symbol not found'}, status=404)
            current_price = float(todays_data['Close'].iloc[-1])
        except Exception as e:
            return Response({'error': f'Failed to fetch stock price: {str(e)}'}, status=500)

        total_cost = current_price * shares
        user_profile, _ = UserProfile.objects.get_or_create(user=request.user)

        if action == 'BUY':
            if float(user_profile.balance) < total_cost:
                return Response({'error': 'Insufficient funds in balance'}, status=400)
            
            user_profile.balance = float(user_profile.balance) - total_cost
            user_profile.save()

            portfolio_item, created = Portfolio.objects.get_or_create(
                user=request.user, symbol=symbol,
                defaults={'shares': shares, 'average_buy_price': current_price}
            )
            if not created:
                total_shares = float(portfolio_item.shares) + shares
                total_spent = (float(portfolio_item.shares) * float(portfolio_item.average_buy_price)) + total_cost
                portfolio_item.average_buy_price = total_spent / total_shares
                portfolio_item.shares = total_shares
                portfolio_item.save()

        elif action == 'SELL':
            try:
                portfolio_item = Portfolio.objects.get(user=request.user, symbol=symbol)
            except Portfolio.DoesNotExist:
                return Response({'error': 'You do not own this stock'}, status=400)

            if float(portfolio_item.shares) < shares:
                return Response({'error': 'You do not own enough shares to sell this quantity'}, status=400)

            user_profile.balance = float(user_profile.balance) + total_cost
            user_profile.save()

            portfolio_item.shares = float(portfolio_item.shares) - shares
            if float(portfolio_item.shares) == 0:
                portfolio_item.delete()
            else:
                portfolio_item.save()

        # Log transaction into transaction history ledger
        Transaction.objects.create(
            user=request.user, symbol=symbol, type=action, shares=shares, price=current_price
        )

        return Response({
            'message': f'Successfully executed {action} for {shares} shares of {symbol}',
            'remaining_balance': round(float(user_profile.balance), 2),
            'execution_price': round(current_price, 2)
        })

class PortfolioView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        portfolio = Portfolio.objects.filter(user=request.user)
        user_profile, _ = UserProfile.objects.get_or_create(user=request.user)
        
        holdings = []
        for item in portfolio:
            try:
                stock = yf.Ticker(item.symbol)
                current_price = float(stock.history(period='1d')['Close'].iloc[-1])
            except Exception:
                current_price = float(item.average_buy_price)
            
            holdings.append({
                'symbol': item.symbol,
                'shares': float(item.shares),
                'average_buy_price': float(item.average_buy_price),
                'current_price': round(current_price, 2),
                'total_value': round(float(item.shares) * current_price, 2),
                'profit_loss': round((current_price - float(item.average_buy_price)) * float(item.shares), 2)
            })

        return Response({
            'balance': round(float(user_profile.balance), 2),
            'holdings': holdings
        })

class TransactionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.filter(user=request.user).order_by('-timestamp')
        data = [{
            'id': t.id,
            'symbol': t.symbol,
            'type': t.type,
            'shares': float(t.shares),
            'price': float(t.price),
            'total_value': round(float(t.shares) * float(t.price), 2),
            'date': t.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        } for t in transactions]
        return Response({'transactions': data})

class WatchlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        watchlist = Watchlist.objects.filter(user=request.user)
        symbols = [item.symbol for item in watchlist]
        return Response({'watchlist': symbols})

    def post(self, request):
        symbol = request.data.get('symbol', '').upper()
        if not symbol:
            return Response({'error': 'Symbol is required'}, status=400)
        
        Watchlist.objects.get_or_create(user=request.user, symbol=symbol)
        return Response({'message': f'Added {symbol} to watchlist'})

    def delete(self, request):
        symbol = request.data.get('symbol', '').upper()
        Watchlist.objects.filter(user=request.user, symbol=symbol).delete()
        return Response({'message': f'Removed {symbol} from watchlist'})