'use strict';

const CATEGORIAS_PADRAO = [
  {
    nome: 'Buraco na via',
    icone: 'road',
    cor_hex: '#EF4444',
    ativo: true,
  },
  {
    nome: 'Falta de iluminação pública',
    icone: 'lightbulb-off',
    cor_hex: '#F59E0B',
    ativo: true,
  },
  {
    nome: 'Falta de água',
    icone: 'droplet-off',
    cor_hex: '#3B82F6',
    ativo: true,
  },
  {
    nome: 'Lixo ou entulho não coletado',
    icone: 'trash-2',
    cor_hex: '#10B981',
    ativo: true,
  },
  {
    nome: 'Outros serviços de zeladoria',
    icone: 'alert-circle',
    cor_hex: '#8B5CF6',
    ativo: true,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [categoriasExistentes] = await queryInterface.sequelize.query(
      'SELECT nome FROM categorias;'
    );

    const nomesExistentes = new Set(categoriasExistentes.map((item) => item.nome));
    const agora = new Date();

    const novasCategorias = CATEGORIAS_PADRAO.filter(
      (cat) => !nomesExistentes.has(cat.nome)
    ).map((cat) => ({
      ...cat,
      created_at: agora,
      updated_at: agora,
    }));

    if (novasCategorias.length > 0) {
      await queryInterface.bulkInsert('categorias', novasCategorias, {});
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      'categorias',
      {
        nome: {
          [Sequelize.Op.in]: CATEGORIAS_PADRAO.map((cat) => cat.nome),
        },
      },
      {}
    );
  },
};
