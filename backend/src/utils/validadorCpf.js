/**
 * Remove qualquer caractere não numérico do CPF.
 * @param {string|number} cpf
 * @returns {string}
 */
function limparCpf(cpf) {
  if (cpf === null || cpf === undefined) return '';
  return String(cpf).replace(/\D/g, '');
}

/**
 * Padroniza o CPF para armazenamento e busca no banco (apenas os 11 dígitos numéricos).
 * @param {string|number} cpf
 * @returns {string}
 */
function formatarCpfPadrao(cpf) {
  return limparCpf(cpf);
}

/**
 * Formata o CPF no padrão visual 000.000.000-00.
 * @param {string|number} cpf
 * @returns {string}
 */
function formatarCpfMascara(cpf) {
  const numeros = limparCpf(cpf);
  if (numeros.length !== 11) return numeros;
  return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Valida matematicamente um CPF brasileiro (11 dígitos, bloqueio de sequências repetidas e cálculo dos 2 dígitos verificadores).
 * @param {string|number} cpf
 * @returns {boolean}
 */
function validarCpf(cpf) {
  const numeros = limparCpf(cpf);

  if (numeros.length !== 11) {
    return false;
  }

  // Rejeita CPFs com todos os dígitos iguais (ex: 000.000.000-00, 111.111.111-11)
  if (/^(\d)\1{10}$/.test(numeros)) {
    return false;
  }

  // Cálculo do 1º dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i += 1) {
    soma += Number(numeros.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) {
    resto = 0;
  }
  if (resto !== Number(numeros.charAt(9))) {
    return false;
  }

  // Cálculo do 2º dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i += 1) {
    soma += Number(numeros.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) {
    resto = 0;
  }
  if (resto !== Number(numeros.charAt(10))) {
    return false;
  }

  return true;
}

module.exports = {
  limparCpf,
  validarCpf,
  formatarCpfPadrao,
  formatarCpfMascara,
};
