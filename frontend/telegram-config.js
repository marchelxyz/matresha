// Telegram Web App Configuration
const TelegramConfig = {
    // Bot token (в реальном приложении должен быть на сервере)
    BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
    
    // Web App URL
    WEB_APP_URL: 'https://matresha.vercel.app',
    
    // API endpoints
    API_BASE_URL: 'https://matresha-production.up.railway.app/api',
    
    // Features configuration
    FEATURES: {
        // Операционное управление
        OPERATIONS: {
            enabled: true,
            features: [
                'kpi_analysis',
                'financial_metrics',
                'performance_reports',
                'optimization_recommendations'
            ]
        },
        
        // Маркетинг
        MARKETING: {
            enabled: true,
            features: [
                'ad_campaign_setup',
                'creative_generation',
                'audience_analysis',
                'conversion_optimization'
            ]
        },
        
        // Бухгалтерия
        ACCOUNTING: {
            enabled: true,
            features: [
                'financial_reports',
                'tax_calculations',
                'russian_compliance',
                'document_generation'
            ]
        },
        
        // Юридический отдел
        LEGAL: {
            enabled: true,
            features: [
                'document_templates',
                'legal_consultations',
                'compliance_checklists',
                'contract_generation'
            ]
        }
    },
    
    // UI Configuration
    UI: {
        theme: 'auto', // auto, light, dark
        language: 'ru',
        animations: true,
        sounds: false
    },
    
    // Rate limiting
    RATE_LIMITS: {
        messages_per_minute: 10,
        daily_requests: 1000
    }
};

// Set global API_BASE_URL if configured
if (TelegramConfig.API_BASE_URL && TelegramConfig.API_BASE_URL !== 'https://your-api-domain.com/api') {
    window.API_BASE_URL = TelegramConfig.API_BASE_URL;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramConfig;
} else {
    window.TelegramConfig = TelegramConfig;
}