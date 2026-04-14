export interface ProviderData {
  id: string;
  name: string;
  category: string;
  specialization: string;
  experience: string;
  rating: number;
  reviewCount: number;
  customers: string;
  price: number;
  image: string;
  bio: string;
  isApproved: boolean;
}

export const providers: ProviderData[] = [];
