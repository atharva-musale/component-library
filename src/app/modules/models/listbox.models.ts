export interface ListboxChangeEvent {
  originalEvent: Event;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

export interface ListboxFilterEvent {
  originalEvent?: Event;
  filter: string | null;
}
