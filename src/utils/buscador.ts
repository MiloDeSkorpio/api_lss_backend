import { InferAttributes, Model, ModelStatic, Op, WhereOptions } from "sequelize"

export async function searchByHexID<T extends Model>(hexID: string, model: ModelStatic<T>) {
  const result = await model.findOne({
    where: {
      serial_hex: {
        [Op.eq]: hexID
      }
    } as WhereOptions<InferAttributes<T>>,
    raw: true
  })

  return result
} 