import { SerialMustBeActive } from "../../utils/validation";
import { BaseValidationDto } from "./BaseTIMTDto";

export class BajasTIMTDto  extends BaseValidationDto { 
@SerialMustBeActive()
declare serial_hex: string;

}
