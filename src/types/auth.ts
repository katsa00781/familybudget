// User and Authentication Types
export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
}
