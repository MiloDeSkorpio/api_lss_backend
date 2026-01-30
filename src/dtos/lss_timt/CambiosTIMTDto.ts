import { HasAtLeastOne, HasChangesForLocationDiasHorario } from "../../utils/validation";
import { BaseValidationDto } from "./BaseTIMTDto";

export class CambiosTIMTDto extends BaseValidationDto { 
   @HasAtLeastOne(['location_id','dias', 'horario'])
  @HasChangesForLocationDiasHorario({
    message: 'Debe modificar al menos location_id, dias o horario respecto a la versión actual'
  })
  dummyField?: any; // necesario para aplicar el decorador
}