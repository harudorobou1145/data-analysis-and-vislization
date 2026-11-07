def simplify(x, n):
    """Return whether the product of two fraction strings is a whole number.

    Each argument has the form ``<positive numerator>/<positive denominator>``.
    """
    x_num, x_den = map(int, x.split("/"))
    n_num, n_den = map(int, n.split("/"))
    return (x_num * n_num) % (x_den * n_den) == 0
