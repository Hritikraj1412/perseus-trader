from django.urls import path
from .views import (
    RegisterView,          # <-- Purane views hata kar yeh naya naam daalei
    SimpleLoginView,
    StockPriceView, 
    StockHistoryView, 
    TradeView, 
    PortfolioView,
    TransactionHistoryView,
    WatchlistView
)

urlpatterns = [
    # Naya single-step registration path
    path('auth/register/', RegisterView.as_view(), name='register'),
    
    # Login path
    path('auth/login/', SimpleLoginView.as_view(), name='login'),
    
    # Aapke baaki sabhi paths bilkul waise hi rahenge...
    path('stock/<str:symbol>/price/', StockPriceView.as_view(), name='stock-price'),
    path('stock/<str:symbol>/history/', StockHistoryView.as_view(), name='stock-history'),
    path('trade/', TradeView.as_view(), name='trade'),
    path('portfolio/', PortfolioView.as_view(), name='portfolio'),
    path('transactions/', TransactionHistoryView.as_view(), name='transactions'),
    path('watchlist/', WatchlistView.as_view(), name='watchlist'),
]