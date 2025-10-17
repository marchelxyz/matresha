// API Service for Business Assistant
class BusinessAPI {
    constructor() {
        this.baseURL = 'https://your-api-domain.com/api';
        this.timeout = 30000; // 30 seconds
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: this.timeout,
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Operations Management API
    async analyzeKPIs(data) {
        return this.request('/operations/kpi-analysis', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async generateFinancialReport(period, companyData) {
        return this.request('/operations/financial-report', {
            method: 'POST',
            body: JSON.stringify({ period, companyData })
        });
    }

    async getOptimizationRecommendations(metrics) {
        return this.request('/operations/optimization', {
            method: 'POST',
            body: JSON.stringify({ metrics })
        });
    }

    // Marketing API
    async createAdCampaign(campaignData) {
        return this.request('/marketing/campaign', {
            method: 'POST',
            body: JSON.stringify(campaignData)
        });
    }

    async generateCreatives(brief) {
        return this.request('/marketing/creatives', {
            method: 'POST',
            body: JSON.stringify({ brief })
        });
    }

    async analyzeAudience(targetData) {
        return this.request('/marketing/audience', {
            method: 'POST',
            body: JSON.stringify(targetData)
        });
    }

    // Accounting API
    async calculateTaxes(financialData, taxSystem) {
        return this.request('/accounting/tax-calculation', {
            method: 'POST',
            body: JSON.stringify({ financialData, taxSystem })
        });
    }

    async generateTaxReport(period, companyInfo) {
        return this.request('/accounting/tax-report', {
            method: 'POST',
            body: JSON.stringify({ period, companyInfo })
        });
    }

    async createFinancialStatement(data) {
        return this.request('/accounting/financial-statement', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // Legal API
    async generateDocument(templateType, data) {
        return this.request('/legal/document', {
            method: 'POST',
            body: JSON.stringify({ templateType, data })
        });
    }

    async getLegalChecklist(businessType, activities) {
        return this.request('/legal/checklist', {
            method: 'POST',
            body: JSON.stringify({ businessType, activities })
        });
    }

    async getLegalConsultation(question, context) {
        return this.request('/legal/consultation', {
            method: 'POST',
            body: JSON.stringify({ question, context })
        });
    }

    // AI Chat API
    async sendMessage(message, section, context = {}) {
        return this.request('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
                message,
                section,
                context,
                timestamp: new Date().toISOString()
            })
        });
    }

    // Utility methods
    async healthCheck() {
        return this.request('/health');
    }

    async getVersion() {
        return this.request('/version');
    }
}

// Mock API for development
class MockBusinessAPI extends BusinessAPI {
    constructor() {
        super();
        this.baseURL = 'mock://api';
    }

    async request(endpoint, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // Return mock data based on endpoint
        return this.getMockResponse(endpoint, options);
    }

    getMockResponse(endpoint, options) {
        const mockResponses = {
            '/operations/kpi-analysis': {
                success: true,
                data: {
                    kpis: {
                        revenue: { current: 2500000, target: 3000000, trend: 'up' },
                        profit: { current: 500000, target: 600000, trend: 'up' },
                        margin: { current: 20, target: 25, trend: 'stable' }
                    },
                    recommendations: [
                        'Увеличить маржинальность на 5%',
                        'Оптимизировать операционные расходы',
                        'Улучшить конверсию продаж'
                    ]
                }
            },
            '/marketing/creatives': {
                success: true,
                data: {
                    creatives: [
                        {
                            type: 'banner',
                            title: 'Увеличьте прибыль на 30%',
                            description: 'Наше решение поможет оптимизировать бизнес-процессы',
                            cta: 'Узнать больше'
                        },
                        {
                            type: 'video',
                            title: 'Как мы помогли 1000+ компаний',
                            description: 'Реальные кейсы наших клиентов',
                            cta: 'Смотреть видео'
                        }
                    ]
                }
            },
            '/accounting/tax-calculation': {
                success: true,
                data: {
                    taxSystem: 'USN_6',
                    revenue: 2500000,
                    taxAmount: 150000,
                    deductions: 0,
                    netTax: 150000
                }
            },
            '/legal/document': {
                success: true,
                data: {
                    documentType: 'supply_contract',
                    content: 'ДОГОВОР ПОСТАВКИ\n\n[Сгенерированный контент документа]',
                    variables: ['supplier_name', 'buyer_name', 'product_description']
                }
            },
            '/ai/chat': {
                success: true,
                data: {
                    response: 'Это демонстрационный ответ AI-ассистента. В реальном приложении здесь будет интеллектуальный ответ на основе вашего запроса.',
                    suggestions: [
                        'Расскажи подробнее',
                        'Покажи примеры',
                        'Создай отчет'
                    ]
                }
            }
        };

        return mockResponses[endpoint] || {
            success: false,
            error: 'Endpoint not found'
        };
    }
}

// Initialize API instance
const api = new MockBusinessAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BusinessAPI, MockBusinessAPI, api };
} else {
    window.BusinessAPI = BusinessAPI;
    window.MockBusinessAPI = MockBusinessAPI;
    window.api = api;
}