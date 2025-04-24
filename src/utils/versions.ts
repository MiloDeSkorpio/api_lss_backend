import { InferAttributes, Model, ModelStatic, WhereOptions } from 'sequelize'
import { checkDuplicates, eliminarRegistros, getMaxVersion } from "./validation"

export async function getHighestVersionRecords<T extends Model>(
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


// Función principal de procesamiento
export async function processVersionUpdate<T extends Model>(
  currentVersionRecords: any[],
  model: ModelStatic<T>,
  altasData: any[],
  bajasData: any[],
  cambiosData: any[]
) {
  const currentVersion = await getMaxVersion(model)
  const newVersion = currentVersion + 1
  console.log('oldVer',currentVersion)
  console.log('newVer',newVersion)
  // Verificación de duplicados en altas
  const { finalRecords, duplicates } = checkDuplicates(currentVersionRecords, altasData)
  
  const finalRecordsFiltrados = eliminarRegistros(finalRecords, cambiosData, bajasData)
  console.log('Actual',currentVersionRecords.length)
  console.log('Altas',altasData.length)
  console.log('Bajas',bajasData.length)
  console.log('Cambios',cambiosData.length)
  console.log('Actuales + Altas',currentVersionRecords.length + altasData.length - duplicates.length)
  console.log('Duplicados',duplicates.length)
  console.log('Finales',finalRecordsFiltrados.length)
  

  // Preparar transacción
  const transaction = await model.sequelize.transaction()
  
  try {
    // Procesar bajas (eliminación lógica)
    if (bajasData.length > 0) {
      const serialesBajas = bajasData.map(item => item.SERIAL_DEC)
    
      await model.update(
        { ESTADO: 'INACTIVO', VERSION: newVersion },
        {
          where: {
            SERIAL_DEC: serialesBajas,
            ESTADO: 'ACTIVO', 
            VERSION: currentVersion
          } as WhereOptions<InferAttributes<T>>,
          transaction
        }
      )
    }

    // Procesar cambios
    if (cambiosData.length > 0) {
      await Promise.all(
        cambiosData.map(item =>
          model.update(
            { ...item, VERSION: newVersion },
            {
              where: {
                SERIAL_DEC: item.SERIAL_DEC,
                VERSION: currentVersion
              },
              transaction
            }
          )
        )
      )
    }
    // Procesar altas (solo registros únicos)
    if (finalRecordsFiltrados.length > 0) {
      await model.bulkCreate(
        finalRecordsFiltrados.map(item => ({
          ...item,
          VERSION: newVersion,
        })),
        { transaction }
      )
    }

    // Commit de la transacción
    await transaction.commit()

    // Obtener registros de la nueva versión
    const newVersionRecords = await model.findAll({
      where: { VERSION: newVersion },
      raw: true
    })

    return {
      success: true,
      newVersion,
      newRecordsCount: newVersionRecords.length,
      duplicates,
      stats: {
        altas: finalRecords.length,
        bajas: bajasData.length,
        cambios: cambiosData.length,
        duplicados: duplicates.length
      }
    }

  } catch (error) {
    await transaction.rollback()
    console.error('Error en procesamiento:', error)
    throw error
  }
}

