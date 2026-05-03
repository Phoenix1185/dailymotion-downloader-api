export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface VideoFormat {
  formatId: string;
  ext: string;
  resolution: string;
  quality: string;
  filesize?: number;
  filesizeApprox?: number;
  hasVideo: boolean;
  hasAudio: boolean;
}

export interface VideoInfo {
  id: string;
  title: string;
  description?: string;
  duration: number;
  thumbnail: string;
  uploader?: string;
  formats: VideoFormat[];
}

export interface DownloadResult {
  video: {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
  };
  download: {
    url: string;
    format: VideoFormat;
    expiresAt: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface SubscriptionInfo {
  tier: string;
  status: string;
  downloadLimit: number;
  downloadsUsed: number;
  apiKeyLimit: number;
  quality: string;
  currentPeriodEnd: Date | null;
}

export interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paystackReference: string | null;
  createdAt: Date;
}
