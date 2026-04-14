import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

// Revenue data functions
export async function getRevenueData(days: number) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef,
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const revenueData: { date: string; amount: number }[] = [];

    // Initialize all days with 0 revenue
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      revenueData.push({ date: dateStr, amount: 0 });
    }

    // Aggregate revenue by day
    querySnapshot.forEach((doc) => {
      const transaction = doc.data();
      if (transaction.amount && transaction.createdAt) {
        const date = transaction.createdAt.toDate();
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayIndex = revenueData.findIndex(item => item.date === dateStr);
        if (dayIndex !== -1) {
          revenueData[dayIndex].amount += transaction.amount;
        }
      }
    });

    return revenueData;
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    // Return mock data for development
    const mockData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      mockData.push({ 
        date: dateStr, 
        amount: Math.floor(Math.random() * 50000) + 10000 
      });
    }
    return mockData;
  }
}

// Bookings data functions
export async function getBookingsData(days: number) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const bookingsData: { date: string; bookings: number }[] = [];

    // Initialize all days with 0 bookings
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bookingsData.push({ date: dateStr, bookings: 0 });
    }

    // Aggregate bookings by day
    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      if (booking.createdAt) {
        const date = booking.createdAt.toDate();
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayIndex = bookingsData.findIndex(item => item.date === dateStr);
        if (dayIndex !== -1) {
          bookingsData[dayIndex].bookings += 1;
        }
      }
    });

    return bookingsData;
  } catch (error) {
    console.error('Error fetching bookings data:', error);
    // Return mock data for development
    const mockData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      mockData.push({ 
        date: dateStr, 
        bookings: Math.floor(Math.random() * 15) + 1 
      });
    }
    return mockData;
  }
}

// Category data functions
export async function getCategoryData() {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'), limit(1000));
    const querySnapshot = await getDocs(q);

    const categoryCount: { [key: string]: number } = {};

    querySnapshot.forEach((doc) => {
      const booking = doc.data();
      const category = booking.category || booking.serviceCategory || 'Other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const total = Object.values(categoryCount).reduce((sum, count) => sum + count, 0);
    
    const categoryData = Object.entries(categoryCount).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / total) * 100)
    })).sort((a, b) => b.value - a.value);

    return categoryData;
  } catch (error) {
    console.error('Error fetching category data:', error);
    // Return mock data for development
    return [
      { name: 'Cleaning', value: 45, percentage: 30 },
      { name: 'Plumbing', value: 30, percentage: 20 },
      { name: 'Electrical', value: 25, percentage: 17 },
      { name: 'Gardening', value: 20, percentage: 13 },
      { name: 'Painting', value: 15, percentage: 10 },
      { name: 'Other', value: 15, percentage: 10 }
    ];
  }
}

// Providers data functions
export async function getProvidersData(weeks: number) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (weeks * 7));

    const providersRef = collection(db, 'providers');
    const q = query(
      providersRef,
      where('createdAt', '>=', startDate),
      where('createdAt', '<=', endDate),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const providersData: { week: string; providers: number }[] = [];

    // Initialize all weeks with 0 providers
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((weeks - 1 - i) * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weekStr = `Week ${i + 1}`;
      providersData.push({ week: weekStr, providers: 0 });
    }

    // Aggregate providers by week
    querySnapshot.forEach((doc) => {
      const provider = doc.data();
      if (provider.createdAt) {
        const createdDate = provider.createdAt.toDate();
        const weekIndex = Math.floor((endDate.getTime() - createdDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if (weekIndex >= 0 && weekIndex < weeks) {
          providersData[weeks - 1 - weekIndex].providers += 1;
        }
      }
    });

    return providersData;
  } catch (error) {
    console.error('Error fetching providers data:', error);
    // Return mock data for development
    const mockData = [];
    for (let i = 0; i < weeks; i++) {
      mockData.push({ 
        week: `Week ${i + 1}`, 
        providers: Math.floor(Math.random() * 10) + 1 
      });
    }
    return mockData;
  }
}
