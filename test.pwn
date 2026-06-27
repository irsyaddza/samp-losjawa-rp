#include <a_samp>
#include <formatex>

main() {
    new str[128];
    formatex(str, sizeof str, "My favourite vehicle is: '%v'!", 400); // should print "Landstalker"
    print(str);
}