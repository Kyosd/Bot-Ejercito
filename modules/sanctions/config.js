// modules/sanctions/config.js

module.exports = {

    // ===============================================
    // QUIÉN PUEDE USAR /sancionar
    // (IDs de usuarios o roles)
    // ===============================================
    generals: [ 
        "434520425288957956"


        // EJEMPLOS:
        // "123456789012345678",  // ID de usuario
        // "987654321098765432"   // ID de rol
    ],

    // ===============================================
    // CANALES DEL SISTEMA DE SANCIONES
    // ===============================================
    sanctionsChannel: "1442198055368786120",       // Canal donde se publican las sanciones
    logsChannel: "1442198095759806525",            // Canal donde se envían los logs internos

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
