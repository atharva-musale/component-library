/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { ListboxFilterEvent } from '../../models';
import {
  ControlValueAccessor,
  FormBuilder,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
  UntypedFormGroup,
} from '@angular/forms';
import { ListBoxComponent } from '../list-box/list-box';

@Component({
  imports: [ListBoxComponent, ReactiveFormsModule],
  selector: 'app-pick-list',
  styleUrl: './pick-list.css',
  templateUrl: './pick-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PickList),
      multi: true,
    },
  ],
})
export class PickList implements ControlValueAccessor, OnInit {
  /** Full set of items available for selection */
  allItems = input<any[]>([]);

  /** Items that should be preselected in the right-hand list box. */
  preselectedItems = input<any[]>([]);

  /** Name of the property on each item used as its display label and for filtering. */
  optionLabel = input('name');

  /** Property name to use as the value for an option. */
  optionValue = input<string | undefined>(undefined);

  /** Title displayed above the left (available items) list box. */
  leftTitle = input('');

  /** Title displayed above the right (selected items) list box. */
  rightTitle = input('');

  /** Message displayed when the left (available items) list box has no items. */
  leftEmptyMessage = input('');

  /** Message displayed when the right (selected items) list box has no items. */
  rightEmptyMessage = input('');

  /** Whether to display the filter input above each list box. */
  showFilter = input(true);

  /** Whether the entire pick list is disabled. */
  disabled = input(false);

  /** Whether virtual scrolling is enabled for the list boxes. */
  virtualScroll = input(false);

  /** Item size, in pixels, used by virtual scrolling when enabled. */
  virtualScrollItemSize = input(34);

  /** Height of the scrollable viewport for each list box. */
  scrollHeight = input('250px');

  /**
   * Emits the selected items when the selection changes
   * Can be used to react to selection changes if form control is not passed
   */
  selectionChange = output<any[]>();

  public pickListForm: UntypedFormGroup;

  /**
   * Function to call when the value changes (for ControlValueAccessor).
   * This is set by Angular when the component is used in a form.
   */
  public onChangeFn: (value: any) => void = () => {};
  public onTouchedFn: () => void = () => {};

  private fb = inject(FormBuilder);

  /** Current filter text applied to the left (available) list box. */
  leftFilter: string | null = '';

  /** Current filter text applied to the right (selected) list box. */
  rightFilter: string | null = '';

  constructor() {
    this.pickListForm = this.fb.group({
      sourceList: new FormControl<any[]>([]),
      targetList: new FormControl<any[]>([]),
      // holds items currently highlighted (pending a move), driven by list-box's own CVA
      sourceSelection: new FormControl<any[]>([]),
      targetSelection: new FormControl<any[]>([]),
    });
  }

  ngOnInit() {
    this.getRightListControl().setValue(this.preselectedItems() ?? []);
    this.syncSourceList();
  }

  moveToRight() {
    this.move(
      this.getLeftListControl(),
      this.getRightListControl(),
      this.getLeftSelectionControl().value,
    );
    this.getLeftSelectionControl().setValue([]);
  }

  moveAllToRight() {
    this.move(this.getLeftListControl(), this.getRightListControl(), this.getLeftFilteredItems());
    this.getLeftSelectionControl().setValue([]);
  }

  moveToLeft() {
    this.move(
      this.getRightListControl(),
      this.getLeftListControl(),
      this.getRightSelectionControl().value,
    );
    this.getRightSelectionControl().setValue([]);
  }

  moveAllToLeft() {
    this.move(this.getRightListControl(), this.getLeftListControl(), this.getRightFilteredItems());
    this.getRightSelectionControl().setValue([]);
  }

  /** Moves the given items from one list control to the other and notifies the CVA consumer. */
  private move(from: FormControl<any[]>, to: FormControl<any[]>, items: any[]): void {
    if (!items || items.length === 0) {
      return;
    }
    to.setValue([...to.value, ...items]);
    from.setValue(from.value.filter((item: any) => !items.includes(item)));

    const targetValue = this.getRightListControl().value;
    this.onChangeFn(targetValue);
    this.onTouchedFn();
    this.selectionChange.emit(targetValue);
  }

  getLeftFilteredItems() {
    return this.filterItems(this.getLeftListControl().value, this.leftFilter);
  }

  getRightFilteredItems() {
    return this.filterItems(this.getRightListControl().value, this.rightFilter);
  }

  private filterItems(items: any[], filter: string | null): any[] {
    if (!filter) {
      return items;
    }
    const filterProp = this.optionLabel();
    return items.filter((item) =>
      String(item[filterProp]).toLocaleLowerCase().includes(filter.toLocaleLowerCase()),
    );
  }

  onLeftFilter(event: ListboxFilterEvent): void {
    this.leftFilter = event.filter;
  }

  onRightFilter(event: ListboxFilterEvent): void {
    this.rightFilter = event.filter;
  }

  public writeValue(obj: any) {
    this.getRightListControl().setValue(Array.isArray(obj) ? obj : []);
    this.syncSourceList();
  }

  /** Recomputes the available (left) list as allItems minus whatever is currently selected (right). */
  private syncSourceList(): void {
    const selectedItems = this.getRightListControl().value ?? [];
    this.getLeftListControl().setValue(
      this.allItems().filter((item) => !selectedItems.includes(item)),
    );
  }

  public getLeftListControl(): FormControl<any[]> {
    return this.pickListForm.get('sourceList') as FormControl<any[]>;
  }

  public getRightListControl(): FormControl<any[]> {
    return this.pickListForm.get('targetList') as FormControl<any[]>;
  }

  public getLeftSelectionControl(): FormControl<any[]> {
    return this.pickListForm.get('sourceSelection') as FormControl<any[]>;
  }

  public getRightSelectionControl(): FormControl<any[]> {
    return this.pickListForm.get('targetSelection') as FormControl<any[]>;
  }

  public registerOnChange(fn: any) {
    this.onChangeFn = fn;
  }
  public registerOnTouched(fn: any) {
    this.onTouchedFn = fn;
  }
  public setDisabledState(isDisabled: boolean) {
    return isDisabled ? this.pickListForm.disable() : this.pickListForm.enable();
  }
}
