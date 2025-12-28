
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  icon?: any;
  color: string;
}

export interface DailyOrder {
  [key: string]: number;
}

export interface UserData {
  userName: string;
  balance: number;
  selections: {
    [dateStr: string]: DailyOrder;
  };
}

export type ActiveTab = 'order' | 'manage' | 'menu';
