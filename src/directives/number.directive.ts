import { NgControl } from '@angular/forms';

import {
  Directive,
  ElementRef,
  HostListener,
  Output,
  EventEmitter,
  Input,
  AfterViewInit,
  Self,
  Optional,
} from '@angular/core';

import { isEmpty } from '../utils/utils';
import { prefixCompareType } from '../enums/enum';
import { Keys } from '../constants/keys.constants';

@Directive({
  selector: '[number]',
})
export class NumberDirective implements AfterViewInit {
  @Output() blurDirective: EventEmitter<any> = new EventEmitter();

  @Input() name: string = '';

  @Input() countDecimal?: number;

  @Input() countInt?: number;

  @Input() withDefault?: boolean;

  @Input() withNegatives?: boolean;

  @Input() withPercentage?: boolean;

  @Input() otherCharacters?: string | string[];

  @Input() withMessages?: boolean;

  @Input() prColin?: any;

  @Input() prefix?: string;

  @Input() sufix?: string;

  @Input() min?: number;

  @Input() max?: number;

  @Input() prefixCompare: prefixCompareType = prefixCompareType.GREAT;

  @Input() nullValue?: string;

  @Input() setMessageByColumn!: (valueBD: string, content: string) => void;

  private valueDefault: string = '';

  private regex!: RegExp;

  private numberColin: number = 0;

  private withDecimal: boolean = false;

  constructor(
    private el: ElementRef,
    @Self() @Optional() private control: NgControl
  ) {}

  ngAfterViewInit(): void {
    this.withDecimal = !!this.countDecimal;

    const otherRegex = this.createOtherRegex();

    const negativeRegx = this.withNegatives ? '-?' : '';

    const percentageRegx = this.withPercentage ? '%?' : '';

    const regexInts = this.countInt ? `{0,${this.countInt}}` : '*';

    const regexDecimal = this.withDecimal
      ? `([.,]\\d{0,${this.countDecimal}})?`
      : '';

    const regexString = `^(${negativeRegx}\\d${regexInts}${regexDecimal}${percentageRegx}$)${otherRegex}`;

    this.regex = new RegExp(regexString);

    this.prefixCompare = this.prefixCompare
      ? this.prefixCompare
      : prefixCompareType.GREAT;
  }

  @HostListener('focus', ['$event.target'])
  onFocus(target: any) {
    this.valueDefault = target.value;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    const isPaste = event.ctrlKey && event.key.toUpperCase() === 'V';

    if (!isPaste) {
      if (
        event.key &&
        (Keys.specialKeys.includes(event.key) ||
          (Keys.ctrlKeys.includes(event.key.toUpperCase()) &&
            (event.ctrlKey || event.metaKey)))
      ) {
        return;
      }

      this.checkIsValid(event, this.el.nativeElement, event.key);
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: any) {
    let value: string = this.el.nativeElement.value.replace(',', '.');

    if (
      this.otherCharacters !== undefined &&
      (this.otherCharacters.includes(value.toLowerCase()) ||
        this.otherCharacters.includes(value.toUpperCase()))
    ) {
      value = value.toUpperCase();
    } else {
      const havePercentage = value.includes('%');

      if (this.el.nativeElement.value) {
        let valueElement: string = this.el.nativeElement.value.replace(
          ',',
          '.'
        );

        if (
          (valueElement.substring(0) === '.' && valueElement.length === 1) ||
          (valueElement.substring(0) === '-' && valueElement.length === 1) ||
          (valueElement.substring(0) === '.-' && valueElement.length === 2) ||
          (valueElement.substring(0) === '-.' && valueElement.length === 2)
        ) {
          value = '';
        } else {
          if (valueElement.substring(0) === '.')
            valueElement = '0.' + valueElement;

          value = this.countDecimal
            ? parseFloat(valueElement).toFixed(this.countDecimal)
            : valueElement;
        }
      }

      if (this.checkMinMax(value)) {
        value = this.countDecimal
          ? this.formatValue(value, this.countDecimal)
          : value;

        if (
          this.prColin !== null &&
          this.prColin !== undefined &&
          this.prColin.length > 0
        ) {
          if (
            (this.prColin.indexOf('%') > -1 && havePercentage) ||
            (this.prColin.indexOf('%') === -1 && !havePercentage)
          ) {
            this.numberColin = parseFloat(
              this.prColin.toString().replace(',', '.').replace('%', '')
            );

            const valueFloat = parseFloat(
              value.replace(',', '.').replace('%', '')
            );

            value = this.name.toUpperCase().includes('INI')
              ? this.prIni(valueFloat, this.prefixCompare)
              : this.prFin(valueFloat, this.prefixCompare);

            value =
              value.length !== 0
                ? parseFloat(value).toFixed(this.countDecimal).replace('.', ',')
                : '';
          }
        }

        value = value.replace('.', ',');

        value = havePercentage && value.length > 0 ? `${value}%` : value;

        event.target.value =
          havePercentage && value.length > 0 ? `${value}%` : value;
      } else {
        if (value.trim().length > 0) this.showEventMessage(event, 'max-min');

        value = '';
      }
    }

    if (!value && this.withDefault) value = this.valueDefault;

    if (this.control) this.control!.control!.setValue(value);

    if (this.nullValue && isEmpty(value)) value = this.nullValue;

    this.blurDirective.emit({ value, name: this.name, target: event.target });
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    this.checkIsValid(
      event,
      event.target,
      event.clipboardData!.getData('text')
    );
  }

  private checkIsValid(event: any, element: any, value: any) {
    const current: string = element.value;

    const position = element.selectionStart;

    const next: string = [
      current.slice(0, position),
      value === 'Decimal' ? '.' : value,
      current.slice(position),
    ].join('');

    if (
      next &&
      !String(next).match(this.regex) &&
      !this.isSelection(element, value)
    ) {
      if (!isNaN(parseInt(value, 10))) {
        if (this.withDecimal) {
          const numberValue: string = element.value;

          if (
            numberValue.includes(',') &&
            numberValue.split(',').length > 1 &&
            !this.isIntegerPart(element)
          ) {
            if (numberValue.split(',')[1].length === this.countDecimal) {
              if (this.withMessages) {
                this.showEventMessage(event, 'dec-max');
              }
            }
          } else if (
            numberValue.includes('.') &&
            numberValue.split('.').length > 1 &&
            !this.isIntegerPart(element)
          ) {
            if (numberValue.split('.')[1].length === this.countDecimal) {
              if (this.withMessages) {
                this.showEventMessage(event, 'dec-max');
              }
            }
          }
        }
      }

      event.preventDefault();
    }
  }

  private isSelection(element: any, key: any) {
    return (
      element.selectionEnd === element.value.length &&
      element.selectionStart === 0 &&
      String(key).match(this.regex)
    );
  }

  private isIntegerPart(element: any) {
    const value = element.value.replace('.', ',');

    const positionComma = value.indexOf(',');

    return element.selectionStart <= positionComma;
  }

  private formatValue(originValue: string, countDecimal: number): string {
    let value = '';

    if (originValue) {
      let valueElement: string = originValue.replace(',', '.');

      if (
        (valueElement.substring(0) === '-' ||
          valueElement.substring(0) === '.') &&
        valueElement.length === 1
      ) {
        value = '';
      } else {
        valueElement =
          valueElement.substring(0) === '.'
            ? '0.' + valueElement
            : valueElement;

        value = parseFloat(valueElement)
          .toFixed(countDecimal)
          .replace(',', '.');

        if (originValue.includes('%')) {
          value += '%';
        }
      }
    }

    return value;
  }

  private prIni(value: number, type: string) {
    const validation =
      type === prefixCompareType.GREAT
        ? value >= this.numberColin
        : value <= this.numberColin;

    if (validation && this.setMessageByColumn) {
      this.setMessageByColumn(this.name, 'prIni');

      return '';
    }

    return this.el.nativeElement.value.replace(',', '.');
  }

  private prFin(value: number, type: string) {
    const validation =
      type === prefixCompareType.GREAT
        ? value <= this.numberColin
        : value >= this.numberColin;

    if (validation && this.setMessageByColumn) {
      this.setMessageByColumn(this.name, 'prFin');

      return '';
    }

    return this.el.nativeElement.value.replace(',', '.');
  }

  private checkMinMax(next: string) {
    return !(
      this.min &&
      this.max &&
      !isNaN(parseFloat(next)) &&
      (parseFloat(next) > this.max || parseFloat(next) < this.min)
    );
  }

  private showEventMessage(event: any, keyString: string): void {
    event.preventDefault();

    if (this.setMessageByColumn) this.setMessageByColumn(this.name, keyString);
  }

  private createOtherRegex(): string {
    let otherRegex = '';

    if (this.otherCharacters) {
      if (!Array.isArray(this.otherCharacters)) {
        otherRegex = this.otherCharacters
          ? `|(^[/${this.otherCharacters.toLowerCase()}]?$)|(^[/${this.otherCharacters.toUpperCase()}]?$)`
          : '';
      } else {
        this.otherCharacters.forEach((char) => {
          otherRegex = `|(^[/${char.toLowerCase()}]?$)|(^[/${char.toUpperCase()}]?$)`;
        });
      }
    }

    return otherRegex;
  }
}
