import { InferAttributes, Model, ModelStatic, WhereOptions } from "sequelize"

// 1. Función para verificar duplicados
function checkDuplicates(currentRecords: any[], newRecords: any[], keyField = 'SERIAL_DEC') {
  const existingKeys = new Set(currentRecords.map(record => record[keyField]))
  const duplicates: any[] = []
  const uniqueNewRecords = newRecords.filter(record => {
    const isDuplicate = existingKeys.has(record[keyField])
    if (isDuplicate) duplicates.push(record)
    return !isDuplicate
  })
  return { uniqueNewRecords, duplicates }
}

// 2. Función principal de procesamiento
export async function processVersionUpdate<T extends Model>(
  currentVersionRecords: any[],
  model: ModelStatic<T>,
  altasData: any[],
  bajasData: any[],
  cambiosData: any[]
) {
  const currentVersion = currentVersionRecords.length > 0
    ? currentVersionRecords[0].VERSION
    : 0;
  const newVersion = currentVersion + 1

  // Verificación de duplicados en altas
  const { uniqueNewRecords, duplicates } = checkDuplicates(currentVersionRecords, altasData)

  // Preparar transacción
  const transaction = await model.sequelize.transaction()

  try {
    // 1. Procesar bajas (eliminación lógica)
    if (bajasData.length > 0) {
      await model.update(
        { ESTADO: 'INACTIVO', VERSION: newVersion },
        {
          where: {
            SERIAL_DEC: bajasData.map(item => item.SERIAL_DEC),
            VERSION: currentVersion
          } as WhereOptions<InferAttributes<T>>,
          transaction
        }
      )
    }

    // 2. Procesar cambios
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

    // 3. Procesar altas (solo registros únicos)
    if (uniqueNewRecords.length > 0) {
      await model.bulkCreate(
        uniqueNewRecords.map(item => ({
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
        altas: uniqueNewRecords.length,
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

