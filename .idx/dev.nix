{ pkgs, ... }: {
  # Canal de NixOS estable
  channel = "stable-24.05";

  # Paquetes de software necesarios
  packages = [
    pkgs.nodejs_20
  ];

  # Configuración específica de IDX
  idx = {
    # Extensiones de VS Code que se instalarán automáticamente
    extensions = [
      "astro-build.astro-vscode"
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
      "tamasfe.even-better-toml"
      "bradlc.vscode-tailwindcss"
      "Prisma.prisma"
      "formulahendry.auto-rename-tag"
      "christian-kohler.path-intellisense"
    ];

    # Configuración de la previsualización web
    previews = {
      enable = true;
      previews = {
        web = {
          command = [
            "npm"
            "run"
            "dev"
            "--"
            "--port"
            "$PORT"
            "--hostname"
            "0.0.0.0"
          ];
          manager = "web";
        };
      };
    };
  };

  # Variables de entorno (Configuración de Nómina Venezuela)
  env = {
    SALARIO_NORMAL_CALC = "quincenal";
    DIAS_TRABAJADOS_DEFAULT = "15";
    CONTRIBUCION_PENSION_PATRONAL = "0.09";
    CAJA_AHORRO_PATRONAL_VISIBLE = "false";
    THEME = "enterprise-dark";
    HIDE_PATRONAL_FROM_RECEIPT = "true"; # Oculta el 9% del recibo
    LABEL_LPH_REPLACEMENT = "FAOV";       # Cambia LPH por FAOV
    DYNAMIC_SOCIAL_SECURITY = "true";    # Quita "Obrero" de cargos administrativos
    SHOW_EMPLOYER_COST_SUMMARY = "true";
    ALLOW_PERIOD_REOPEN = "true";
  };
}
