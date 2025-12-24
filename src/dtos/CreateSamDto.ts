import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer';
 
export class CreateSamDto {
    @IsNotEmpty()
    @IsString()
    production_log_file: string;

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    serial_number_decimal: bigint;

    @IsString()
    @IsNotEmpty()
    serial_number_hexadecimal: string;

    @IsString()
    @IsNotEmpty()
    configuration: string;

    @IsString()
    @IsNotEmpty()
    reference: string;
    
    @IsString()
    @IsNotEmpty()
    line_operator_or_recipient: string;

    @IsString()
    @IsNotEmpty()
    lock_index: string;

    @IsString() 
    @IsNotEmpty()
    production_date: string;
}
