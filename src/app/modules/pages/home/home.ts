import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UntypedFormGroup, FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { generateMockDataItemList } from '../../helpers';
import { MockData } from '../../models';
import { ListBoxComponent, PickList } from '../../components';

@Component({
  imports: [PickList, ListBoxComponent, ReactiveFormsModule],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  public items: MockData[];
  public form: UntypedFormGroup;

  private readonly fb = inject(FormBuilder);

  constructor() {
    this.items = generateMockDataItemList(500);
    this.form = this.fb.group({
      selectedItems: new FormControl<MockData[]>([]),
      pickedItems: new FormControl<MockData[]>([]),
    });
    this.form.valueChanges.subscribe((value) => {
      console.log('Form value:', value);
    });
  }
}
