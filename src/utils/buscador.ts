import { InferAttributes, Model, ModelStatic, Op, WhereOptions } from "sequelize"
import { SamsRepository } from "../repositories/SamsRepository"

export async function searchByHexID<T extends Model>(hexID: string, model: ModelStatic<T>, keyField: string) {
  const result = await model.findOne({
    where: {
      [keyField]: {
        [Op.eq]: hexID
      }
    } as WhereOptions<InferAttributes<T>>,
    raw: true
  })
  return result
}

const inventoryRepo = new SamsRepository()

export async function assertSamExistsInInventory(
  serialHex: string
): Promise<void> {
  const result = await inventoryRepo.existsBySerialHex(serialHex)
  if (!result) {
    throw new Error(
      `El SAM ${serialHex} no existe en inventario`
    )
  }
}
