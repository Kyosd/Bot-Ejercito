// modules/sanctions/config.js

module.exports = {

    // ===============================================
    // QUIÉN PUEDE USAR /sancionar
    // (IDs de usuarios o roles)
    // ===============================================
    generals: [ 
         "1398131944872480890",
         "1420882354775527484",
         "1392985835355508766",
         "1392985835355508766",
         "1396673898984112168",


        // EJEMPLOS:
        // "123456789012345678",  // ID de usuario
        // "987654321098765432"   // ID de rol
    ],

    // ===============================================
    // CANALES DEL SISTEMA DE SANCIONES
    // ===============================================
    sanctionsChannel: "1398132210346889236",       // Canal donde se publican las sanciones
    logsChannel: "1444087102701834280",            // Canal donde se envían los logs internos

    /*
        EJEMPLO:

        sanctionsChannel: "128391273981273981",
        logsChannel: "129837128937129837",
    */

    // ===============================================
    // COLORES DE EMBEDS
    // ===============================================
    colors: {
        warning: "#ffaa00",
        log: "#1e2b3c"
    }
};
