import { InferAttributes, Model, ModelStatic, Op, WhereOptions } from "sequelize"

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