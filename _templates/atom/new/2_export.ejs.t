---
inject: true
to: components/atoms/<%= h.dirpath(dir) %>/index.ts
skip_if: ./<%= h.capitalize(name) %>
append: true
---

export * from './<%= h.capitalize(name) %>';
