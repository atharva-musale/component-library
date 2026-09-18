import { MockData } from '../models';

export function generateMockDataItemList(count: number): MockData[] {
  const items: MockData[] = [];
  for (let i = 1; i <= count; i++) {
    items.push({
      id: `item-${i}`,
      name: `Item ${i}`,
      description: `Description for Item ${i}`,
      data: null,
    });
  }
  return items;
}
