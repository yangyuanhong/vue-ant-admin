export interface LineChartDataSum {
  newVisitis: ChartData;
  messages: ChartData;
  purchases: ChartData;
  shoppings: ChartData;
}

export type ChartData = {
  expectedData: number[];
  actualData: number[];
};

export interface TransactionList {
  order_no: string;
  timestamp: string;
  username: string;
  price: number;
  status: "0" | "1";
};

export interface ResponseData {
  total: 20,
  items: TransactionList[]
}

export interface Response {
  code: number;
  data: ResponseData|null,
  message: string;
}

export interface TodoData {
  text: string;
  done: boolean;
}

export interface FilterTodo {
  all: Function;
  active: Function
  completed: Function
}