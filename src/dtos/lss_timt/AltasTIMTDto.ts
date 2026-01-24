import { SerialNotInLastVersion } from "../../utils/validation";
import { BaseValidationDto } from "./BaseTIMTDto";


export class AltasTIMTDto extends BaseValidationDto { 
  @SerialNotInLastVersion()
  declare serial_hex: string;

}