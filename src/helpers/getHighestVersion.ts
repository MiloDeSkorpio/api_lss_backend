import { InferAttributes, Model, ModelStatic, WhereOptions } from 'sequelize'

export async function getHighestVersion<T extends Model>(
  model: ModelStatic<T>,
  versionField: keyof InferAttributes<T> = 'VERSION' as keyof InferAttributes<T>,
  statusField: keyof InferAttributes<T> = 'ESTADO' as keyof InferAttributes<T>,
): Promise<T[]> {
  try {
    // 1. Verificar si la tabla existe
    const tableExists = await model.sequelize?.getQueryInterface().tableExists(model.tableName)
    
    if (!tableExists) {
      await model.sync()
      return []
    }

    // 2. Obtener la versión más alta (con seguridad de tipos)
    const maxVersion = await model.max(versionField as string)
    
    if (maxVersion === null || maxVersion === undefined) {
      return []
    }

    // 3. Buscar registros con esa versión
    const result = await model.findAll({
      where: {
        [versionField]: maxVersion,
        [statusField]: 'ACTIVO'
      } as WhereOptions<InferAttributes<T>>,
      raw: true 
    })
    
    return result

  } catch (error) {
    console.error(`Error in getHighestVersion (table: ${model.tableName}):`, error)
    throw error
  }
}