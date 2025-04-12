import { InferAttributes, Model, ModelStatic, WhereOptions } from "sequelize"

function checkDuplicates(currentRecords: any[], newRecords: any[], keyField = 'SERIAL_DEC') {
  // Paso 1: Identificar duplicados
  const existingKeys = new Set(currentRecords.map(record => record[keyField]))
  const duplicates: any[] = []

  // Paso 2: Filtrar duplicados
  const uniqueNewRecords = newRecords.filter(record => {
    const isDuplicate = existingKeys.has(record[keyField])
    if (isDuplicate) duplicates.push(record)
    return !isDuplicate
  })
  
  // Paso 3: Combinar registros únicos con los existentes
  const combinedRecords = [...currentRecords, ...uniqueNewRecords]

  // Paso 4: Eliminar duplicados en la combinación (si es necesario)
  const finalRecords = Array.from(new Set(combinedRecords.map(record => record[keyField])))
    .map(key => combinedRecords.find(record => record[keyField] === key))
  
  return { finalRecords, duplicates }
}

// Función principal de procesamiento
export async function processVersionUpdate<T extends Model>(
  currentVersionRecords: any[],
  model: ModelStatic<T>,
  altasData: any[],
  bajasData: any[],
  cambiosData: any[]
) {
  const currentVersion = currentVersionRecords.length > 0
    ? currentVersionRecords[0].VERSION
    : 0
  const newVersion = currentVersion + 1

  // Verificación de duplicados en altas
  const { finalRecords, duplicates } = checkDuplicates(currentVersionRecords, altasData)

  // Preparar transacción
  const transaction = await model.sequelize.transaction()
  
  try {
    // Procesar bajas (eliminación lógica)
    if (bajasData.length > 0) {
      const serialesBajas = bajasData.map(item => item.SERIAL_DEC);
    
      await model.update(
        { ESTADO: 'INACTIVO', VERSION: newVersion },
        {
          where: {
            SERIAL_DEC: serialesBajas,
            ESTADO: 'ACTIVO', // Solo actualizamos los ACTIVOS
            VERSION: currentVersion
          } as WhereOptions<InferAttributes<T>>,
          transaction
        }
      );
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
    if (finalRecords.length > 0) {
      await model.bulkCreate(
        finalRecords.map(item => ({
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

