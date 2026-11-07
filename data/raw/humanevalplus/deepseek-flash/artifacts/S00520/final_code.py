
def simplify(x, n):
    """Return whether the product of the fractions x and n is a whole number.

    Each fraction is represented as ``<numerator>/<denominator>``.  The
    fractions are multiplied exactly, without using floating-point arithmetic.
    """
    x_numerator, x_denominator = map(int, x.split("/"))
    n_numerator, n_denominator = map(int, n.split("/"))

    return (x_numerator * n_numerator) % (x_denominator * n_denominator) == 0
