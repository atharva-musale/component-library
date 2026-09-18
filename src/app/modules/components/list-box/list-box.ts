/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  input,
  output,
  Signal,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { ListboxChangeEvent, ListboxFilterEvent } from '../../models';

@Component({
  selector: 'app-list-box',
  templateUrl: './list-box.html',
  styleUrl: './list-box.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ListBoxComponent),
      multi: true,
    },
  ],
})
export class ListBoxComponent implements ControlValueAccessor {
  /** The list of options to display in the listbox */
  public options = input<any[]>([]);

  /** Property name to use as the display label for an option. */
  public optionLabel = input<string | undefined>(undefined);

  /** Property name to use as the value for an option. */
  public optionValue = input<string | undefined>(undefined);

  /** Whether multiple selection is allowed. */
  public multiple = input(false);

  /** Whether the listbox filter is enabled. */
  public filter = input(false);

  /** Whether the listbox is disabled. */
  public disabled = input(false);

  /** The style object to apply to the listbox element. */
  public listStyle = input<Record<string, string> | undefined>(undefined);

  /** Whether virtual scrolling is enabled. */
  public virtualScroll = input(false);

  /** Height in pixels of each item when virtual scrolling is enabled. */
  public virtualScrollItemSize = input(38);

  /** Height of the scrollable viewport. */
  public scrollHeight = input('250px');

  /** Message displayed when there are no options to show. */
  public emptyMessage = input('No results found');

  /** Placeholder text displayed in the filter input. */
  public filterPlaceHolder = input('Search');

  /** Emitted when the selection changes. */
  public listboxChangeEvent = output<ListboxChangeEvent>();

  /** Emitted when the filter text changes. */
  public listboxFilterEvent = output<ListboxFilterEvent>();

  /** Reactive form control backing the filter input (two-way bound via [formControl]). */
  public filterControl = new FormControl('');

  /** The current filter text, derived from the filter control's value changes. */
  private readonly filterText = toSignal(this.filterControl.valueChanges, {
    initialValue: this.filterControl.value ?? '',
  });

  /** The index of the currently focused option (for keyboard navigation). */
  public focusedIndex = signal(-1);

  /** The current scroll position of the listbox (for virtual scrolling). */
  public scrollTop = signal(0);

  /** The options remaining after applying the current filter text. */
  public filteredOptions: Signal<any[]>;

  /** Total height of the virtualized list (used to set the height of the scrollable area). */
  public totalHeight: Signal<number>;

  /** Vertical offset applied to the rendered subset of items in the virtualized viewport. */
  public offsetY: Signal<number>;

  /** The subset of filtered options currently rendered in the virtualized viewport. */
  public visibleItems: Signal<{ option: any; index: number }[]>;

  /** Reference to the scrollable viewport element (div inside virtual scroll section in html). */
  private readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');

  /** Number of extra rows rendered above/below the viewport to smooth out fast scrolling */
  private readonly overscan = 5;

  /** The currently selected value (for single selection). */
  private readonly selectedValue = signal<any>(null);

  /** The currently selected values (for multiple selection). */
  private readonly selectedValues = signal<Set<any>>(new Set());

  /**
   * Function to call when the value changes (for ControlValueAccessor).
   * This is set by Angular when the component is used in a form.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onChangeFn: (value: any) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public onTouchedFn: () => void = () => {};

  constructor() {
    this.filteredOptions = computed(() => {
      const searchText = (this.filterText() ?? '').trim().toLowerCase();
      if (!searchText) {
        return this.options();
      }
      return this.options().filter((option) =>
        this.getOptionLabel(option).toLowerCase().includes(searchText),
      );
    });

    this.totalHeight = computed(() => this.filteredOptions().length * this.virtualScrollItemSize());

    /** Range of indexes which are displayed to the user */
    const virtualRange: Signal<{ start: number; end: number }> = computed(() => {
      const itemSize = this.virtualScrollItemSize();
      const viewportHeight = parseInt(this.scrollHeight(), 10) || 0;
      const count = this.filteredOptions().length;
      const start = Math.max(0, Math.floor(this.scrollTop() / itemSize) - this.overscan);
      const visibleCount = Math.ceil(viewportHeight / itemSize) + this.overscan * 2;
      const end = Math.min(count, start + visibleCount);
      return { start, end };
    });

    this.offsetY = computed(() => virtualRange().start * this.virtualScrollItemSize());

    this.visibleItems = computed(() => {
      const { start, end } = virtualRange();
      return this.filteredOptions()
        .slice(start, end)
        .map((option, i) => ({ option, index: start + i }));
    });

    // reset scroll position and notify consumers whenever the filter text changes
    this.filterControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((filter) => {
      this.scrollTop.set(0);
      const viewportEl = this.viewport()?.nativeElement;
      if (viewportEl) {
        viewportEl.scrollTop = 0;
      }
      this.listboxFilterEvent.emit({ filter });
    });

    // keep the filter control's disabled state in sync with the disabled input
    effect(() => {
      if (this.disabled()) {
        this.filterControl.disable({ emitEvent: false });
      } else {
        this.filterControl.enable({ emitEvent: false });
      }
    });
  }

  /**
   * Computes the display label for a given option based on the `optionLabel` property.
   *
   * @param option current option
   * @returns label
   */
  public getOptionLabel(option: any): string {
    const label = this.optionLabel();
    return label ? option[label] : option;
  }

  /**
   * Gets the value for a given option based on the `optionValue` property.
   *
   * @param option current option
   * @returns value
   */
  public getOptionValue(option: any): any {
    const value = this.optionValue();
    return value ? option[value] : option;
  }

  /**
   * Checks if a given option is currently selected.
   *
   * @param option option
   * @returns boolean
   */
  public isSelected(option: any): boolean {
    const value = this.getOptionValue(option);
    return this.multiple() ? this.selectedValues().has(value) : this.selectedValue() === value;
  }

  /**
   * Updates the scrollTop signal when the listbox is scrolled.
   * This is used for virtual scrolling calculations.
   *
   * @param event scroll event
   */
  public onScroll(event: Event): void {
    this.scrollTop.set((event.target as HTMLElement).scrollTop);
  }

  /**
   * Handles the selection of an option.
   *
   * @param option option
   * @param event event
   */
  public selectOption(option: any, event: Event): void {
    if (this.disabled()) {
      return;
    }

    const value = this.getOptionValue(option);
    let emittedValue: any;

    if (this.multiple()) {
      const selectedValues = new Set(this.selectedValues());
      if (selectedValues.has(value)) {
        selectedValues.delete(value);
      } else {
        selectedValues.add(value);
      }
      this.selectedValues.set(selectedValues);
      emittedValue = Array.from(selectedValues);
    } else {
      this.selectedValue.set(value);
      emittedValue = value;
    }

    /** Tell angular forms (CVA) that value has changed */
    this.onChangeFn(emittedValue);
    this.onTouchedFn();
    this.listboxChangeEvent.emit({ originalEvent: event, value: emittedValue });
  }

  /**
   * Handles keyboard navigation within the listbox.
   *
   * @param event keyboard event
   */
  public onKeyDown(event: KeyboardEvent): void {
    const optionCount = this.filteredOptions().length;
    if (optionCount === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex.set(Math.min(this.focusedIndex() + 1, optionCount - 1));
        this.scrollToFocused();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex.set(Math.max(this.focusedIndex() - 1, 0));
        this.scrollToFocused();
        break;
      case 'Home':
        event.preventDefault();
        this.focusedIndex.set(0);
        this.scrollToFocused();
        break;
      case 'End':
        event.preventDefault();
        this.focusedIndex.set(optionCount - 1);
        this.scrollToFocused();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.focusedIndex() >= 0) {
          this.selectOption(this.filteredOptions()[this.focusedIndex()], event);
        }
        break;
    }
  }

  // keeps the keyboard-focused row inside the virtualized viewport
  private scrollToFocused(): void {
    if (!this.virtualScroll()) {
      return;
    }
    const viewportEl = this.viewport()?.nativeElement;
    if (!viewportEl) {
      return;
    }

    const itemSize = this.virtualScrollItemSize();
    const itemTop = this.focusedIndex() * itemSize;
    const itemBottom = itemTop + itemSize;

    if (itemTop < viewportEl.scrollTop) {
      viewportEl.scrollTop = itemTop;
    } else if (itemBottom > viewportEl.scrollTop + viewportEl.clientHeight) {
      viewportEl.scrollTop = itemBottom - viewportEl.clientHeight;
    }
    this.scrollTop.set(viewportEl.scrollTop);
  }

  /**
   * Called by Angular forms to set the value of the listbox.
   *
   * @param value value
   */
  writeValue(value: any): void {
    if (this.multiple()) {
      this.selectedValues.set(new Set(value ?? []));
    } else {
      this.selectedValue.set(value ?? null);
    }
  }

  /**
   * Called by Angular forms to register a callback for when the value changes.
   *
   * @param fn function
   */
  registerOnChange(fn: (value: any) => void): void {
    this.onChangeFn = fn;
  }

  /**
   * Called by Angular forms to register a callback for when the control is touched (blurred).
   *
   * @param fn function
   */
  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }
}
