'use strict';

const bcrypt = require('bcryptjs');

const EMAIL_GESTOR = 'gabinete@vozurbana.gov.br';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [usuariosExistentes] = await queryInterface.sequelize.query(
      'SELECT id FROM usuarios WHERE email = :email LIMIT 1;',
      {
        replacements: { email: EMAIL_GESTOR },
      }
    );

    if (usuariosExistentes.length === 0) {
      const agora = new Date();

      await queryInterface.bulkInsert(
        'usuarios',
        [
          {
            nome: 'Gabinete da Prefeitura',
            email: EMAIL_GESTOR,
            cpf: '000.000.000-00',
            senha_hash: bcrypt.hashSync('Prefeitura@2026', 10),
            google_id: null,
            perfil: 'GESTOR',
            created_at: agora,
            updated_at: agora,
          },
        ],
        {}
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'usuarios',
      {
        email: EMAIL_GESTOR,
      },
      {}
    );
  },
};
