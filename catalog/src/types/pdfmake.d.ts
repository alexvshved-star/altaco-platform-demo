// Білд-файли pdfmake без власних d.ts → оголошуємо як any (для клієнтської генерації КП).
declare module "pdfmake/build/pdfmake";
declare module "pdfmake/build/vfs_fonts";
