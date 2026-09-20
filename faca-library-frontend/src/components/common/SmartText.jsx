import { useSmartTranslate } from '../../hooks/useSmartTranslate';

const T = ({ text, k = null, children, as: Tag = 'span', ...rest }) => {
    const { smartT } = useSmartTranslate();
    const source = children !== undefined ? String(children) : text;

    return (
        <Tag {...rest}>
            {smartT(source, k)}
        </Tag>
    );
};

export default T;
