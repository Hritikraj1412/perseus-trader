from django.urls import path
from .views import (
    RegisterStep1View,
    RegisterStep2View,
    SimpleLoginView,
    StockPriceView, 
    StockHistoryView, 
    TradeView, 
    PortfolioView,
    TransactionHistoryView,
    WatchlistView
)

urlpatterns = [
    path('auth/register-step1/', RegisterStep1View.as_view(), name='register-step1'),
    path('auth/register-step2/', RegisterStep2View.as_view(), name='register-step2'),
    path('auth/login/', SimpleLoginView.as_view(), name='login'),
    
    path('stock/<str:symbol>/', StockPriceView.as_view(), name='stock-price'),
    path('stock/<str:symbol>/history/', StockHistoryView.as_view(), name='stock-history'),
    path('trade/', TradeView.as_view(), name='trade'),
    path('portfolio/', PortfolioView.as_view(), name='portfolio'),
    path('transactions/', TransactionHistoryView.as_view(), name='transactions'),
    path('watchlist/', WatchlistView.as_view(), name='watchlist'),
]