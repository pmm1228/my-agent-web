# Design system

## Source of truth

- Treat `src/styles/tokens.css` as the source of truth for shared color, spacing, typography,
  radius, elevation, and layout values.
- Treat `src/styles/element-plus.css` as the only global Element Plus variable mapping layer.
- Keep component-specific Element Plus overrides beside the shared component that owns them.

## Spacing

Use the 4px spacing scale before introducing a one-off value:

| Purpose | Token |
| --- | --- |
| Icon/text and compact title/body gap | `--space-2` |
| Control or form-item gap | `--space-4` |
| Module-internal section gap | `--space-6` |
| Page padding | `--page-padding` |
| Large module gap | `--space-8` |
| Panel padding | `--panel-padding` |

Retain a one-off value only when it expresses a component-specific geometry that the scale cannot
represent, such as an icon size or chat-shell dimension. Do not create a token for every number.

## Typography

- Use `--font-size-body` for normal copy and controls.
- Use `--font-size-sm` for helper and validation text.
- Use `--font-size-xs` for compact metadata.
- Use `--font-size-md` for module headings and `--font-size-xl` for page headings.
- Use the global system font and the provided line-height tokens.

## Color and shape

- Use semantic color tokens instead of raw brand, state, text, or surface colors.
- Use `--radius-control` for inputs and buttons, `--radius-md` for cards, and
  `--radius-panel` for primary containers.
- Reuse `--shadow-panel` and the glass tokens for main floating surfaces.
- Keep pure white or translucent values local only when they describe a unique layered surface.

## Component workflow

1. Check existing tokens before adding CSS values.
2. Keep layout rules scoped to their component.
3. Promote a value to a token when it is semantic and reused across modules.
4. Map library theming through `element-plus.css`; never edit Element Plus package files.
5. Check desktop and mobile behavior after changing spacing or typography.
