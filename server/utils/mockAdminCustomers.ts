import { getQuery } from 'h3';
import { mockCustomers } from '~/server/utils/mockDashboardData';
import { getDemoUserProfile } from '~/server/utils/mockDashboardDemo';
import { AccountStatusEnum, type UserInterface } from '~/types/auth/user-interface';

export const getAdminMockCustomers = (): UserInterface[] => {
    return mockCustomers.map((customer) => {
        const profile = getDemoUserProfile(customer._id);

        return {
            ...profile,
            firebaseId: customer._id,
            createdAt: customer.registeredAt,
            spent: Number(customer.totalSpent || 0),
            ordersCount: Number(customer.totalOrders || 0),
            status: String(customer.status).toLowerCase() === 'inactive' ? AccountStatusEnum.Inactive : AccountStatusEnum.Active,
        } as unknown as UserInterface;
    });
};

export const getPaginatedAdminMockCustomers = (event: Parameters<typeof getQuery>[0]) => {
    const query = getQuery(event);
    const page = Math.max(1, Number(query.page || 1));
    const perPage = Math.max(1, Number(query.perPage || 10));

    const searchTerm = String(query.name || query.search || '')
        .trim()
        .toLowerCase();

    let items = getAdminMockCustomers();

    if (searchTerm) {
        items = items.filter((user) => {
            const fullName =
                user.accountType === 0
                    ? `${user.personalDetails?.firstName || ''} ${user.personalDetails?.lastName || ''}`
                    : `${user.contactDetails?.firstName || ''} ${user.contactDetails?.lastName || ''}`;
            return (
                fullName.toLowerCase().includes(searchTerm) ||
                String(user.contactDetails?.email || '')
                    .toLowerCase()
                    .includes(searchTerm) ||
                String(user.companyDetails?.name || '')
                    .toLowerCase()
                    .includes(searchTerm)
            );
        });
    }

    const total_items = items.length;
    const page_count = Math.max(1, Math.ceil(total_items / perPage));
    const start = (page - 1) * perPage;

    return {
        page,
        page_count,
        total_items,
        items: items.slice(start, start + perPage),
    };
};

export const getCustomersTotalWidgetMock = () => {
    const customers = getAdminMockCustomers();
    const points = [12, 13, 14, 16, 18, 20, customers.length];

    return {
        series: [{ data: points }],
        total: customers.length,
        delta: 12.5,
    };
};

export const getReturningCustomersWidgetMock = () => {
    const customers = getAdminMockCustomers();
    const returning = customers.filter((customer) => Number(customer.ordersCount || 0) > 1);
    const points = [5, 6, 7, 8, 9, 10, returning.length];

    return {
        series: [{ data: points }],
        total: returning.length,
        delta: 6.2,
    };
};

export const getNewCustomersWidgetMock = () => {
    return getAdminMockCustomers()
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 7);
};

export const getCustomersByCountryWidgetMock = () => {
    // Dataset is USA-only, but provide a richer mock dashboard distribution for demo visuals.
    return [
        { label: 'United States', count: 18, theme: '#5E6278' },
        { label: 'Germany', count: 7, theme: '#00D395' },
        { label: 'Romania', count: 5, theme: '#007FFF' },
        { label: 'United Kingdom', count: 4, theme: '#FA4B4B' },
        { label: 'France', count: 3, theme: '#F59E0B' },
    ];
};
