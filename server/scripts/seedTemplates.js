import mongoose from 'mongoose';
import dotenv from 'dotenv';
import OKRTemplate from '../models/OKRTemplate.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://dongvanict3_db_user:7yC5wXM1niXHGUmz@cluster0.vrlouhe.mongodb.net/';

const templates = [
    // Technology Company Templates
    {
        title: 'Tăng doanh thu công ty lên 30%',
        description: 'Mục tiêu phát triển doanh thu toàn công ty trong quý tới',
        type: 'COMPANY',
        industry: 'Technology',
        category: 'Revenue',
        priority: 'HIGH',
        tags: ['Revenue', 'Growth', 'Q1 2026'],
        suggestedKRs: [
            { title: 'Đạt doanh thu $5M từ khách hàng mới', unit: 'USD', targetValue: 5000000, weight: 3 },
            { title: 'Tăng số lượng khách hàng lên 10,000', unit: 'customers', targetValue: 10000, weight: 2 },
            { title: 'Giảm tỷ lệ churn xuống 5%', unit: '%', targetValue: 5, weight: 2 }
        ]
    },
    {
        title: 'Cải thiện chất lượng sản phẩm',
        description: 'Nâng cao trải nghiệm người dùng và độ ổn định hệ thống',
        type: 'COMPANY',
        industry: 'Technology',
        category: 'Product',
        priority: 'HIGH',
        tags: ['Quality', 'UX', 'Performance'],
        suggestedKRs: [
            { title: 'Giảm thời gian load trang xuống dưới 2s', unit: 'seconds', targetValue: 2, weight: 3 },
            { title: 'Đạt 95% uptime hệ thống', unit: '%', targetValue: 95, weight: 3 },
            { title: 'NPS score đạt 50+', unit: 'score', targetValue: 50, weight: 2 }
        ]
    },
    {
        title: 'Mở rộng thị phần khu vực Đông Nam Á',
        description: 'Phát triển thị trường quốc tế trong khu vực SEA',
        type: 'COMPANY',
        industry: 'Technology',
        category: 'Expansion',
        priority: 'MEDIUM',
        tags: ['International', 'Growth', 'SEA'],
        suggestedKRs: [
            { title: 'Mở văn phòng tại 2 quốc gia mới', unit: 'offices', targetValue: 2, weight: 3 },
            { title: 'Chiếm 15% thị phần tại Thái Lan', unit: '%', targetValue: 15, weight: 2 },
            { title: 'Đạt 50,000 người dùng tại Singapore', unit: 'users', targetValue: 50000, weight: 2 }
        ]
    },
    {
        title: 'Xây dựng văn hóa làm việc hiệu quả',
        description: 'Tăng cường engagement và năng suất nhân viên',
        type: 'COMPANY',
        industry: 'Technology',
        category: 'Culture',
        priority: 'MEDIUM',
        tags: ['Culture', 'HR', 'Employee'],
        suggestedKRs: [
            { title: 'Employee satisfaction đạt 85%', unit: '%', targetValue: 85, weight: 3 },
            { title: 'Tổ chức 4 sự kiện team building', unit: 'events', targetValue: 4, weight: 1 },
            { title: 'Giảm tỷ lệ nghỉ việc xuống 10%', unit: '%', targetValue: 10, weight: 3 }
        ]
    },
    {
        title: 'Tăng hiệu quả vận hành',
        description: 'Tối ưu hóa quy trình và giảm chi phí vận hành',
        type: 'COMPANY',
        industry: 'Technology',
        category: 'Efficiency',
        priority: 'MEDIUM',
        tags: ['Operations', 'Cost', 'Process'],
        suggestedKRs: [
            { title: 'Giảm 20% chi phí vận hành', unit: '%', targetValue: 20, weight: 3 },
            { title: 'Tự động hóa 80% quy trình manual', unit: '%', targetValue: 80, weight: 2 },
            { title: 'Rút ngắn lead time xuống 5 ngày', unit: 'days', targetValue: 5, weight: 2 }
        ]
    },

    // Department Templates
    {
        title: 'Tăng leads chất lượng từ digital marketing',
        description: 'Phát triển kênh digital để thu hút khách hàng tiềm năng',
        type: 'DEPARTMENT',
        department: 'Marketing',
        industry: 'Technology',
        category: 'Marketing',
        priority: 'HIGH',
        tags: ['Marketing', 'Leads', 'Digital'],
        suggestedKRs: [
            { title: 'Generate 50,000 MQLs', unit: 'leads', targetValue: 50000, weight: 3 },
            { title: 'Cost per lead < $10', unit: 'USD', targetValue: 10, weight: 2 },
            { title: 'Conversion rate từ MQL sang SQL đạt 30%', unit: '%', targetValue: 30, weight: 2 }
        ]
    },
    {
        title: 'Đạt target doanh số quý',
        description: 'Hoàn thành chỉ tiêu doanh số được giao',
        type: 'DEPARTMENT',
        department: 'Sales',
        industry: 'Technology',
        category: 'Revenue',
        priority: 'HIGH',
        tags: ['Sales', 'Revenue', 'Target'],
        suggestedKRs: [
            { title: 'Đạt $3M doanh thu', unit: 'USD', targetValue: 3000000, weight: 3 },
            { title: 'Close 50 deals mới', unit: 'deals', targetValue: 50, weight: 2 },
            { title: 'Upsell/Cross-sell đạt $500K', unit: 'USD', targetValue: 500000, weight: 2 }
        ]
    },
    {
        title: 'Phát triển tính năng mới',
        description: 'Xây dựng và ra mắt các tính năng sản phẩm mới',
        type: 'DEPARTMENT',
        department: 'Engineering',
        industry: 'Technology',
        category: 'Product',
        priority: 'HIGH',
        tags: ['Development', 'Features', 'Product'],
        suggestedKRs: [
            { title: 'Ship 5 tính năng major', unit: 'features', targetValue: 5, weight: 3 },
            { title: 'Code coverage đạt 80%', unit: '%', targetValue: 80, weight: 2 },
            { title: 'Bug rate < 2 bugs/100 LOC', unit: 'bugs', targetValue: 2, weight: 2 }
        ]
    },
    {
        title: 'Tuyển dụng nhân tài',
        description: 'Mở rộng đội ngũ với các vị trí chất lượng cao',
        type: 'DEPARTMENT',
        department: 'HR',
        industry: 'Technology',
        category: 'Talent',
        priority: 'MEDIUM',
        tags: ['Recruitment', 'HR', 'Hiring'],
        suggestedKRs: [
            { title: 'Tuyển 20 senior developers', unit: 'people', targetValue: 20, weight: 3 },
            { title: 'Time to hire < 30 ngày', unit: 'days', targetValue: 30, weight: 2 },
            { title: 'Offer acceptance rate > 80%', unit: '%', targetValue: 80, weight: 2 }
        ]
    },
    {
        title: 'Nâng cao bảo mật hệ thống',
        description: 'Tăng cường an ninh thông tin và tuân thủ',
        type: 'DEPARTMENT',
        department: 'IT',
        industry: 'Technology',
        category: 'Security',
        priority: 'HIGH',
        tags: ['Security', 'Compliance', 'IT'],
        suggestedKRs: [
            { title: 'Zero security incidents', unit: 'incidents', targetValue: 0, weight: 3 },
            { title: 'Đạt ISO 27001 certification', unit: 'cert', targetValue: 1, weight: 3 },
            { title: '100% employees hoàn thành security training', unit: '%', targetValue: 100, weight: 1 }
        ]
    }
];

async function seedTemplates() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing templates
        await OKRTemplate.deleteMany({});
        console.log('🗑️ Cleared existing templates');

        // Insert new templates
        await OKRTemplate.insertMany(templates);
        console.log(`✅ Inserted ${templates.length} OKR templates`);

        const summary = templates.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {});

        console.log('\n📊 Summary:');
        Object.entries(summary).forEach(([type, count]) => {
            console.log(`  - ${type}: ${count} templates`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding templates:', err);
        process.exit(1);
    }
}

seedTemplates();
